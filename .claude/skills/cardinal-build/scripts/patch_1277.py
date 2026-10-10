#!/usr/bin/env python3
"""Build 1277 — the Owens Corning Preferred Contractor lockup on every estimate (Theo, 10 Oct, pick #7).

Theo: "I don't need approval for the preferred contractor logo" … "It's only the
pink panther" … "You have the logo, it's in the roof contract you made."
The artwork is cut from docs/Cardinal_Roofing_Contract.pdf page 1 (top left,
rendered by pdf.js at 6x and cropped) — Theo's own printed master, not redrawn.
It ships at the root as /oc-preferred-contractor.png (651 x 171, 25 KB), the
CARDINAL_LOGO_SRC pattern: client documents fetch it by path, and 1270's email
inlining carries it into the emailed file.

Where it appears, under the Cardinal logo as on the contract:
  - the published estimate (buildDocHtml) and the Good/Better/Best proposal;
  - the in-editor ROOFING ESTIMATE template, where it REPLACES the old pink
    text pill "⭐ Owens Corning® Preferred Contractor" (a hand-set imitation).

usage: python3 patch_1277.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

src = pl.sub(src, "var CARDINAL_LOGO_SRC = '/cardinal-report-logo.png';", "var CARDINAL_LOGO_SRC = '/cardinal-report-logo.png';\n/* 1277: the OC Preferred Contractor lockup, cut from Theo's printed roofing contract. */\nvar OC_PREFERRED_SRC = '/oc-preferred-contractor.png';")
IMG = '<img class="est-ocpc" src="\' + (window.OC_PREFERRED_SRC || \'/oc-preferred-contractor.png\') + \'" alt="Owens Corning Preferred Contractor">'
# published estimate
src = pl.sub(src, """(logo ? '<img class="est-logo" src="' + logo + '" alt="Cardinal Roofing &amp; Renovations">' : '') +
'</div>' +""", """(logo ? '<img class="est-logo" src="' + logo + '" alt="Cardinal Roofing &amp; Renovations">' : '') +
'""" + IMG + """' +   /* 1277 */
'</div>' +""")
src = pl.sub(src, """'.est-logo{width:2.15in;max-width:100%;display:block}\\n' +""", """'.est-logo{width:2.15in;max-width:100%;display:block}\\n' +
'.est-ocpc{display:block;width:1.75in;max-width:70%;margin-top:10px}\\n' +""")
# good / better / best
src = pl.sub(src, """    '<div class="est-brand">' + (logo ? '<img class="est-logo" src="' + logo + '" alt="Cardinal Roofing &amp; Renovations">' : '') + '</div>' +""",
 """    '<div class="est-brand">' + (logo ? '<img class="est-logo" src="' + logo + '" alt="Cardinal Roofing &amp; Renovations">' : '') + '""" + IMG + """' + '</div>' +""")
src = pl.sub(src, """    '.est-logo{width:2in;max-width:100%;display:block}\\n' +""", """    '.est-logo{width:2in;max-width:100%;display:block}\\n' +
    '.est-ocpc{display:block;width:1.65in;max-width:70%;margin-top:9px}\\n' +""")
# the in-editor roofing template: the real lockup replaces the pink text pill
src = pl.sub(src, """  <div class="est-oc">⭐ Owens Corning® Preferred Contractor</div>""", """  <img class="est-oc-img" src="/oc-preferred-contractor.png" alt="Owens Corning Preferred Contractor">""")
src = pl.sub(src, """.est-oc{
  display:inline-block;font-size:10pt;font-weight:700;color:#fff;
  background:#d40f7d;border-radius:14px;padding:3px 14px;margin-top:4px;letter-spacing:.03em;
}""", """.est-oc{
  display:inline-block;font-size:10pt;font-weight:700;color:#fff;
  background:#d40f7d;border-radius:14px;padding:3px 14px;margin-top:4px;letter-spacing:.03em;
}
/* 1277: the real OC Preferred Contractor lockup replaced the pill above */
.est-oc-img{display:block;width:1.9in;max-width:55%;margin:8px auto 0;}""")

src = pl.sub(src, '>v2026-10-10 build 1276<', '>v2026-10-10 build 1277<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1277, d: '2026-10-10', t: 'Owens Corning Preferred Contractor on every estimate',
    s: 'Estimates now carry the Owens Corning Preferred Contractor badge under the Cardinal logo \\u2014 the same artwork printed on our roofing contract. It shows on the published estimate, the emailed copy, the print and the Good / Better / Best proposal.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
