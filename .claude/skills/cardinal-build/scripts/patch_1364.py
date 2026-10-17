"""Build 1364 — a contract's header stops saying Estimate.
Theo, at a siding appointment, then "Merge" on the offer to fix it. Measured on a fresh Siding agreement
(createContractForCurrent('siding') in Chromium): the agreement itself is right — the eleven siding sections,
the buyer, address, phone, email and price prefilled, the Buyer / Co-buyer / Contractor signature slots — but
the shared header above it still read "Estimate #  [e.g. EST-2026-041]", "Estimate Date", "Valid Through
<30 days>" and a second Client Contact row, and the page title said "— Estimate". An agreement does not expire
in 30 days and has no estimate number.
buildEstimate() already rebuilds the header for an invoice (1313) and strips it for a work order (889). This
gives every AGREEMENT / CONTRACT the same treatment: Prepared For · Date · Property Address · Prepared By ·
Client Contact, with the same placeholders prefillClientInfo() already fills, so nothing else changes.
Roofing, Siding and Gutter agreements and the Service Contract all build through it. Documents already
created keep the header they were saved with."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""    out = out.replace('<b>Acceptance.</b> This estimate is valid through the date shown above. Signature below',
                      '<b>Acceptance.</b> Signature below');
  }""",
"""    out = out.replace('<b>Acceptance.</b> This estimate is valid through the date shown above. Signature below',
                      '<b>Acceptance.</b> Signature below');
    /* 1364: ...and its header is an agreement's, not an estimate's: no Estimate #, no Valid Through, one
       contact row. Same placeholders, so prefillClientInfo() fills it exactly as before. */
    out = out.replace('<title>Cardinal Roofing &amp; Renovations — Estimate</title>',
                      '<title>Cardinal Roofing &amp; Renovations — Agreement</title>');
    out = out.replace(/<table class="meta">\\s*<tr><td class="k">Prepared For<\\/td>[\\s\\S]*?<\\/table>/,
      '<table class="meta">\\n' +
      '  <tr><td class="k">Prepared For</td><td><span class="ph">[Client name]</span></td>\\n' +
      '      <td class="k">Date</td><td><span class="ph">[Date]</span></td></tr>\\n' +
      '  <tr><td class="k">Property Address</td><td><span class="ph">[Street, City, State ZIP]</span></td>\\n' +
      '      <td class="k">Prepared By</td><td><span class="ph">[Rep name &amp; title]</span></td></tr>\\n' +
      '  <tr><td class="k">Client Contact</td><td><span class="ph">[Phone · Email]</span></td>\\n' +
      '      <td class="k">&nbsp;</td><td>&nbsp;</td></tr>\\n' +
      '</table>');
  }""")

one(">v2026-10-17 build 1363<button", ">v2026-10-17 build 1364<button")
one("""  { b: 1363, d:'2026-10-17',""",
"""  { b: 1364, d:'2026-10-17', t:'Contracts stop saying Estimate', s:'The top of a new Roofing, Siding or Gutter agreement (and a Service Contract) still carried the estimate header: an empty Estimate number, Estimate Date and a Valid Through date 30 days out. A signed agreement does not expire. The header now reads Prepared For, Date, Property Address, Prepared By and Client Contact, filled in as before. Contracts you already made keep the header they were saved with.' },
  { b: 1363, d:'2026-10-17',""")
pl.write_atomic(path, s)
print('ok 1364')
