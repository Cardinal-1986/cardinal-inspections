"""Build 1395 — the Community header at phone width (23 Oct 2026, polish audit).
At 390px the Community header truncated its own name to "Communi…" and the nav pills (Partners and
Estimates are wider than Contacts/Leads) wrapped Tools onto a second row; the taller header then sat
over the top of the page. Measured in Chromium: pill row 79px -> 42px, title 130px fits its 150px slot.
Phone widths only; the 900px rule above is untouched."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)
a = """  #crBanner .cbn{padding:9px 9px;font-size:13px;}
  #crBanner .cbsrch{flex:1 1 100%;order:9;margin:4px 4px 8px;}
}"""
one(a, a + """
/* 1395: Community's pills (Partners, Estimates) are wider than Contacts/Leads, so at a phone's 390px the row
   wrapped Tools onto a second line and the taller header covered the top of the page. */
@media (max-width:420px){ #crBanner .cbn{--cr-stack:"1395 a narrower step for phones; the 900px and base rules serve wider screens";padding-left:6px;padding-right:6px;} }""")
a2 = """#cr-hd2-bar #cr-hd2-mid #brandTitle h1{font-size:22px !important;line-height:1.15;
  color:var(--hin,#fff);-webkit-text-fill-color:var(--hin,#fff)}"""
one(a2, a2 + """
/* 1395: "Community" truncated to "Communi…" at 390px — the longest portal name steps down on a phone */
@media (max-width:420px){ body[data-crm-head="community"] #cr-hd2-bar #cr-hd2-mid #brandTitle h1{--cr-stack:"1395 phone-only step-down for the longest portal name";font-size:19px !important;} }""")
one(">v2026-10-23 build 1394<", ">v2026-10-23 build 1395<")
one("""  { b: 1394, d:'2026-10-23',""",
"""  { b: 1395, d:'2026-10-23', t:'Community header fits a phone', s:'On a phone the Community header no longer cuts its name to \\u201cCommuni\\u2026\\u201d, and the Partners / Estimates / Photos / Production / Tools row fits on one line instead of wrapping and covering the top of the page.' },
  { b: 1394, d:'2026-10-23',""")
pl.write_atomic(path, s)
print('ok 1395')
