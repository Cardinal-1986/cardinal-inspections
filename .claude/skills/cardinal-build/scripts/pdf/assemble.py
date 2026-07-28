"""Assemble a contract package: Agreement body + T&C + duplicate Notice of
Cancellation (HANDOFF §6d). Usage: python3 assemble.py BODY.pdf OUT.pdf
Requires tc.pdf (generic 5-yr T&C) and notice.pdf beside it."""
import sys
from pypdf import PdfReader, PdfWriter

body = sys.argv[1] if len(sys.argv) > 1 else 'gutter_print_body.pdf'
out = sys.argv[2] if len(sys.argv) > 2 else 'Cardinal_Gutter_Contract.pdf'
w = PdfWriter()
w.append(body)
w.append('tc.pdf')
w.append('notice.pdf')
w.add_metadata({'/Title': 'Cardinal Roofing & Renovations - Gutter Construction Agreement',
                '/Author': 'Cardinal Roofing & Renovations, LLC'})
with open(out, 'wb') as fh:
    w.write(fh)
print('written:', out)
