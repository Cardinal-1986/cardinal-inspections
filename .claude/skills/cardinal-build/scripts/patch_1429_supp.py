#!/usr/bin/env python3
"""patch_H_supp.py <supplement.html in> <out>  -- OPTIONAL, not part of patch_H.py.

Meta item #30 ("the Supplement letter prints with no letterhead, date or phone").
index.html has no printed supplement letter: the in-app Supplement card only files
and records amounts. The one printed supplement letter is the Supplement Desk's
Print (#printArea in supplement.html, ~line 1545), which is where the panel judge
measured it. This adds the letterhead the invoice already prints, verbatim from
index.html's invoice line (legal name, address, phone, website), the report logo
(the value of index.html's CARDINAL_LOGO_SRC), today's date and the claim number.
Nothing else in the letter changes. The Desk carries its own stamp (SD_BUILD);
this script does not bump it.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
if len(sys.argv) != 3:
    print(__doc__); sys.exit(2)
src = pl.load(sys.argv[1])
src = pl.sub(src,
    "  el('printArea').innerHTML =\n"
    "    '<div style=\"font:14px/1.6 Georgia,serif;max-width:7.5in;margin:0 auto;padding:24px;\">' +\n"
    "    '<h2 style=\"font-size:16px;\">' + esc(el('subjEdit').value) + '</h2>' + html +",
    "  /* H (#30): the letter goes to an adjuster on Cardinal's letterhead -- the invoice's own company line,\n"
    "     the report logo (index.html's CARDINAL_LOGO_SRC), the date it was printed and the claim number.\n"
    "     The logo is an <img> inside #printArea, so the photo wait below waits for it too. */\n"
    "  var _lh = '<div style=\"display:flex;align-items:center;gap:14px;border-bottom:2px solid #c8202e;padding-bottom:10px;margin-bottom:14px;\">' +\n"
    "    '<img src=\"/cardinal-report-logo.png\" alt=\"Cardinal Roofing &amp; Renovations\" style=\"height:54px;width:auto;\">' +\n"
    "    '<div style=\"font:12px/1.5 Georgia,serif;color:#000;\">Cardinal Roofing &amp; Renovations, LLC<br>5735 Webster Street, Dayton, Ohio 45414 &middot; ' +\n"
    "    '(937) 576-6753 &middot; www.cardinalrenovations.net</div></div>' +\n"
    "    '<div style=\"font:13px Georgia,serif;margin:0 0 12px;\">' + esc(new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })) +\n"
    "    (S.claim && S.claim.claim_number ? ' &middot; Claim #' + esc(S.claim.claim_number) : '') + '</div>';\n"
    "  el('printArea').innerHTML =\n"
    "    '<div style=\"font:14px/1.6 Georgia,serif;max-width:7.5in;margin:0 auto;padding:24px;\">' + _lh +\n"
    "    '<h2 style=\"font-size:16px;\">' + esc(el('subjEdit').value) + '</h2>' + html +")
pl.write_atomic(sys.argv[2], src)
pl.assert_in(sys.argv[2], 'H (#30)')
print('patch_H_supp: wrote', sys.argv[2])
