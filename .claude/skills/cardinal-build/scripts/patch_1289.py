"""Build 1289 — the client-facing presentation screens keep their own type (fixes 1287).

1287 set one sans across dark retail with a single !important rule, excluding only the
drawer. It also reached the client-facing presentation surfaces — Why Cardinal (#cr-why),
OC Colors (#cr-occ, governed by OC_BRAND_RULES), the Showcase (#cr-show) and The
Appointment (#cr-appt) — which carry their own designed type and are shown across the
kitchen table, not used as app chrome. gate_1236 caught it (Why and Colors titles lost
their Georgia). They are now excluded; the app screens keep the 1287 sans.
Usage: python3 patch_1289.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)
OLD = ':not(svg):not(svg *):not(#cr-lnav):not(#cr-lnav *){\n--cr-stack:"1287 one sans across dark retail; the drawer is excluded";'
NEW = (':not(svg):not(svg *):not(#cr-lnav):not(#cr-lnav *)'
       ':not(:is(#cr-why,#cr-occ,#cr-show,#cr-appt)):not(:is(#cr-why,#cr-occ,#cr-show,#cr-appt) *){\n'
       '--cr-stack:"1287 one sans across dark retail; the drawer and (1289) the client-facing '
       'presentation screens — Why, Colors, Showcase, Appointment — are excluded";')
src = pl.sub(src, OLD, NEW)
src = pl.sub(src, '">v2026-10-10 build 1288<button', '">v2026-10-10 build 1289<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1288,",
  "var CHANGELOG = [\n"
  "  { b: 1289, d: '2026-10-10', t: 'Presentation screens keep their own look',\n"
  "    s: 'The screens you show a homeowner at the table \\u2014 Why Cardinal, Owens Corning Colors, the Showcase and The Appointment \\u2014 keep their own designed lettering. The plain typeface from 1287 now applies only to the working screens of the app.' },\n"
  "  { b: 1288,")
pl.write_atomic(PATH, src)
print('patched 1289')
