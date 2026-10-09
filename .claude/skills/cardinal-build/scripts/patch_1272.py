#!/usr/bin/env python3
"""Build 1272 — an estimate printed from an iPhone is laid out on Letter, not on the phone.

Theo, 9 Oct, two screenshots of the same estimate (EST-2026-0912): on screen it
is the app's letterhead document; printed from Jacob's iPhone the description
column ran one word per line. Measured: in print, 1268's print host lays the
document out at the PHONE's width (390px), because the host lives in the app
page and the app page is device-width. The document's own print rule says
body{width:auto}, which on a phone means 390px.

Fix: inside the print host only, the document body is laid out at the Letter
text width (8.5in minus the template's 0.65in margins = 7.2in) and is never
wider than that. A phone shrinks a page wider than itself to fit the paper, so
the printout keeps the letter layout. Computers do not use the host (1268), so
nothing changes there.

usage: python3 patch_1272.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)
src = pl.sub(src, """  root.innerHTML = links + '<style>' + css + '</style>' +""", """  /* 1272: lay the copy out on Letter, not on the phone. The document's own print
     rule is body{width:auto}, and here "auto" is the app page — 390px on an
     iPhone — so a printed estimate came out one word per line. 7.2in is the
     Letter text width under the templates' 0.65in side margins. */
  var LETTER = '@media print{.crp-body{width:7.2in !important;max-width:none !important;box-sizing:border-box;}}';
  root.innerHTML = links + '<style>' + css + '\\n' + LETTER + '</style>' +""")
src = pl.sub(src, '>v2026-10-09 build 1271<', '>v2026-10-09 build 1272<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1272, d: '2026-10-09', t: 'Estimates print full width on an iPhone',
    s: 'Printing an estimate or report from an iPhone squeezed it to the width of the phone, so the description ran one word to a line. It now prints laid out on a Letter page, the way it looks on a computer.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
