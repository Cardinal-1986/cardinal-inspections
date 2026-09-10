#!/usr/bin/env python3
"""Build 1203 — five small things a rep meets every day.

B5  iPad landscape, Leads & Jobs: the Job Summary panel sat 31px off the right
    of the screen and clipped its own copy. MEASURED, not guessed: the three
    tracks resolve to 230px + 300px + 320px + two 14px gaps = 878px inside a
    789px container, because the left nav takes 288px of a 1194px iPad. The
    two minmax() minimums cannot shrink, so the third column starts at 905 and
    ends at 1225.
B6a The header search only ever acted on Return, and nothing said so - on a
    phone the keyboard key even read "return".
A2  "Job cost (materials + labor, $) - for profit reports" was on the Add
    project form for every rep. At intake nobody knows the cost, and a Sales
    rep does not see profit reports.
A9  The job menu said "Documents 0" beside "Estimates 1" the moment an
    estimate was published, because that tile counts UPLOADED FILES only.
A10 Seven of the fourteen job-menu labels were cut at 390px.

Usage: patch_1203.py --src in.html --dst out.html
"""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

OLD_COLS = ".ljcols{grid-template-columns:230px minmax(300px,1.05fr) minmax(320px,1fr);}"
NEW_COLS = (".ljcols{grid-template-columns:230px minmax(0,1.05fr) minmax(0,1fr);}\n"
  "  /* 1203: the minimums were 300px and 320px, which CANNOT shrink. Measured on\n"
  "     a 1194px iPad: the left nav takes 288, .wrap's padding another 72, so the\n"
  "     grid box is 789 wide - and 230 + 300 + 320 + two 14px gaps is 878. The\n"
  "     third track therefore started at 905 and ended at 1225, 31px past the\n"
  "     screen, with the Job Summary clipping its own last line. minmax(0,fr)\n"
  "     lets the two flexible tracks give way; the 230px rail is unchanged.\n"
  "     gate_1203 measures every box against the viewport rather than trusting\n"
  "     this arithmetic. */")

OLD_SRCH = '<input type="search" id="headSearch" placeholder="Search clients, PO #, address&#8230;">'
NEW_SRCH = ('<input type="search" id="headSearch" enterkeyhint="search"\n'
  '             placeholder="Search clients, PO #, address &#8212; then Return">')

OLD_COST = "document.getElementById('pfJobCost').value = (_ck.job_cost != null) ? _ck.job_cost : '';"
NEW_COST = ("document.getElementById('pfJobCost').value = (_ck.job_cost != null) ? _ck.job_cost : '';\n"
  "  /* 1203: job cost is a profit-report field, and a Sales rep neither knows it\n"
  "     at intake nor sees the reports it feeds. Hidden rather than removed, and\n"
  "     the VALUE is still loaded and saved above, so a rep editing a client\n"
  "     cannot wipe a figure an admin entered. */\n"
  "  try{\n"
  "    var _jcLbl = document.getElementById('pfJobCost').closest('label');\n"
  "    if(_jcLbl) _jcLbl.style.display = isAdminUser() ? '' : 'none';\n"
  "  }catch(_jc){}")

OLD_DOCS = "jt(dbIc('docs'), 'Documents', fileDocs.length, 'docs')"
NEW_DOCS = "jt(dbIc('docs'), 'Files', fileDocs.length, 'docs')"

OLD_JBL = """.jabox .jbl{flex:1;min-width:0;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  font-size:clamp(12px,3.5vw,14px);}"""
NEW_JBL = """/* 1203: this was white-space:nowrap + ellipsis, and at 390px it cut SEVEN of
   the fourteen labels: "Commu…", "Notificat…", "Measure…", "Docume…",
   "Appoint…", "Punch …", "Inspecti…". Wrapping keeps every word and needs no
   opinion about what to rename things to. The row is a grid whose items stretch,
   so a two-line label leaves both tiles the same height, and the tracks are
   already minmax(0,1fr). gate_1203 measures that no label is truncated. */
.jabox .jbl{flex:1;min-width:0;line-height:1.15;overflow-wrap:break-word;
  font-size:clamp(12px,3.5vw,14px);}"""

OLD_STAMP = 'v2026-09-10 build 1202'
NEW_STAMP = 'v2026-09-10 build 1203'
OLD_CL = "var CHANGELOG = [\n  { b: 1202,"
NEW_CL = ("var CHANGELOG = [\n"
  "  { b: 1203, d: '2026-09-10', t: 'Five small things: the iPad panel fits, the search says what to press, and the job menu reads', "
  "s: 'Housekeeping a rep meets every day. <b>On the iPad, sideways, the Job Summary panel on Leads &amp; Jobs sat off the "
  "right-hand edge of the screen</b> and cut off its own last line \\u2014 the three columns were asking for more room than "
  "the page had once the side menu took its share. They now give way and all three fit. <b>The search box says what to "
  "press</b> (\\u201c\\u2026 then Return\\u201d) and your phone keyboard now shows a <b>Search</b> key instead of return. <b>Seven "
  "job-menu buttons were cutting their own labels in half</b> on a phone \\u2014 \\u201cCommu\\u2026\\u201d, \\u201cNotificat\\u2026\\u201d, "
  "\\u201cMeasure\\u2026\\u201d \\u2014 and now wrap to a second line so you can read them. <b>Documents is called Files</b>, because it "
  "counts the files you upload; a published estimate lives under Estimates, and the old name made it look like the "
  "document had vanished. And <b>Job cost is no longer on the Add project form</b> for anyone but an admin \\u2014 it feeds "
  "profit reports, nobody knows it at intake, and it is still there, and still safe, for the people who do use it.' },\n"
  "  { b: 1202,")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True); ap.add_argument('--dst', required=True)
    a = ap.parse_args()
    src = pl.load(a.src); orig = src
    edits = [('lj-cols', OLD_COLS, NEW_COLS), ('search', OLD_SRCH, NEW_SRCH),
             ('job-cost', OLD_COST, NEW_COST), ('docs-tile', OLD_DOCS, NEW_DOCS),
             ('jbl', OLD_JBL, NEW_JBL), ('stamp', OLD_STAMP, NEW_STAMP),
             ('changelog', OLD_CL, NEW_CL)]
    for name, old, _ in edits:
        n = src.count(old)
        assert n == 1, '%s: expected 1 occurrence, found %d' % (name, n)
    for name, old, new in edits:
        src = pl.sub(src, old, new)

    assert src.count('minmax(0,1.05fr) minmax(0,1fr)') == 1
    assert src.count('minmax(300px,1.05fr)') == 0
    assert src.count('enterkeyhint="search"') == 1
    assert src.count("'Documents', fileDocs.length") == 0
    assert src.count("jt(dbIc('docs'), 'Files', fileDocs.length, 'docs')") == 1
    assert src.count('_jcLbl') == 3   # declaration + guard + the write
    # the ellipsis is gone from THIS rule only — other modules keep theirs
    assert src.count('.jabox .jbl{flex:1;min-width:0;line-height:1.15;overflow-wrap:break-word;') == 1
    assert src.count('text-overflow:ellipsis') == orig.count('text-overflow:ellipsis') - 1
    assert src.count('build 1203') == 1 and src.count('build 1202') == 0
    assert src.count('{ b: 1203,') == 1 and src.count('{ b: 1202,') == 1

    pl.write_atomic(a.dst, src)
    for m in ['minmax(0,1.05fr)', 'enterkeyhint="search"', "'Files', fileDocs.length", '_jcLbl']:
        pl.assert_in(a.dst, m)
    print('build 1203 written: %s  (%d -> %d chars)' % (a.dst, len(orig), len(src)))


if __name__ == '__main__':
    main()
