"""patch_1268.py — Print / PDF works on iPhone and iPad (Jacob).
usage: python3 patch_1268.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

# 1. the shared printer, beside the shared downloader
src = pl.sub(src, '''window.CardinalDownload = Object.assign(window.CardinalDownload || {}, {
  html : downloadHtml,''', open(os.path.join(HERE, 'print_1268_add.js')).read() + '''window.CardinalDownload = Object.assign(window.CardinalDownload || {}, {
  html : downloadHtml,''')

# 2. the three Print buttons
src = pl.sub(src, '''    frame.contentWindow.focus();
    frame.contentWindow.print();
    if(d) restorePrintMarks(d);''', '''    /* 1268: through CardinalPrint, which prints the page itself on iPhone/iPad */
    if(window.CardinalPrint) window.CardinalPrint.doc(d, /** @type {any} */ (frame).contentWindow);
    else { frame.contentWindow.focus(); frame.contentWindow.print(); }
    if(d) restorePrintMarks(d);''')
src = pl.sub(src, '''f.contentWindow.focus();
f.contentWindow.print();''', '''/* 1268: iPhone/iPad print the page itself (see CardinalPrint) */
if(window.CardinalPrint) window.CardinalPrint.frame(f);
else { f.contentWindow.focus(); f.contentWindow.print(); }''')
src = pl.sub(src, '''    try{ if(f && f.contentWindow) f.contentWindow.print(); }catch(_){}''', '''    try{ if(f && window.CardinalPrint) window.CardinalPrint.frame(f); else if(f && f.contentWindow) f.contentWindow.print(); }catch(_){}''')

src = pl.sub(src, '>v2026-10-08 build 1267<', '>v2026-10-09 build 1268<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1268, d: '2026-10-09', t: 'Print / PDF works on iPhone and iPad',
    s: 'On an iPhone or iPad, <b>Print / PDF</b> could do nothing at all \\u2014 in the estimate preview, the report editor and the document viewer. It now opens the print sheet, where you can print or save a PDF. Computers print as before. To <b>send</b> an estimate, use <b>Publish</b>: it opens the finished estimate with Email to client, Text to sign and Share link.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
