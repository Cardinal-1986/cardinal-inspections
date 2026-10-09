#!/usr/bin/env python3
"""Build 1274 — an estimate's price table reads on a phone screen (Theo, 9 Oct, a
screenshot of the email link opened on his iPhone: "Estimate still looks bad").

1272 fixed the PRINTOUT. This is the SCREEN: the share link (api/share.js) and
the document itself at phone width. The five-column table (Description, Qty,
Unit, Unit Price, Amount) kept all five columns at 390px, so the description got
what was left — a word a line. Under 560px each line now stacks: the
description across the full width, and under it "1 LS × $5,000.00" with the
amount on the right. Totals stay right-aligned. Print and wider screens are
untouched (screen-only, max-width:560px).

Two places, the same rule:
  - api/share.js injects it, so every estimate ALREADY sent reads properly too;
  - the estimate template carries it, so a new one reads properly anywhere —
    the in-app viewer and the emailed file.

usage: python3 patch_1274.py [index.html] [api/share.js]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
SHARE = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '../../../../api/share.js')

CSS = ('@media screen and (max-width:560px){'
  'table.items thead{display:none}'
  'table.items,table.items tbody,table.items tfoot{display:block;width:100%}'
  'table.items tr{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px;padding:9px 4px;border-bottom:1px solid var(--hair,#e5e2dc)}'
  'table.items td{display:block;width:auto !important;padding:0 !important;border:0 !important}'
  'table.items tbody tr>td:first-child{flex:1 1 100%;margin-bottom:3px}'
  'table.items td.qty,table.items td.unit,table.items td.rate{font-size:10.5pt;color:#555;text-align:left}'
  'table.items td:empty{display:none}'
  'table.items td.unit+td.rate:not(:empty):not(:last-child)::before{content:"\\00d7  "}'
  'table.items tr>td.rate:last-child{margin-left:auto;font-size:11pt;font-weight:700;color:var(--ink,#1d1d1f)}'
  'table.items tr.zeb{background:#f7f6f3}'
  'table.items tr.sec-banner{padding:0;border:0}'
  'table.items tr.sec-banner>td{flex:1 1 100%;padding:10px 9px 8px !important}'
  'table.items tr.sec-sub>td:first-child{flex:1 1 auto;margin:0}'
  'table.items tr.sec-sub td.val{margin-left:auto}'
  'table.items tfoot tr{border:0;justify-content:flex-end;padding:4px}'
  'table.items tfoot td:empty{display:none}'
  'table.items tfoot td.val{margin-left:14px}'
  'table.items tfoot tr.grand{border-top:2px solid var(--ink,#1d1d1f);padding-top:8px;margin-top:4px}'
  '}')

# 1. the template
src = pl.load(PATH)
src = pl.sub(src, """'.accept-card .ac-sign{flex-direction:column;gap:20px}\\n' +
'}\\n' +
'</style>\\n' +""", """'.accept-card .ac-sign{flex-direction:column;gap:20px}\\n' +
'}\\n' +
/* 1274: on a phone each priced line stacks — the description full width, then
   "qty unit × price" and the amount — instead of five columns at 390px. */
'""" + CSS.replace('\\', '\\\\') + """\\n' +
'</style>\\n' +""")
src = pl.sub(src, '>v2026-10-09 build 1273<', '>v2026-10-09 build 1274<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1274, d: '2026-10-09', t: 'Estimates read on a phone',
    s: 'Opened on a phone \\u2014 from the email link or in the app \\u2014 an estimate squeezed its five columns onto the screen, so the description ran one word to a line. Each line now stacks: the description across the screen, then the quantity, unit and price with the amount on the right. Estimates already sent read the new way too.' },
''')
pl.write_atomic(PATH, src)

# 2. the share link
sh = open(SHARE, encoding='utf-8').read()
a = """    const FIX = '<style id="shareFix">.howto{display:none !important}' +"""
assert sh.count(a) == 1
sh = sh.replace(a, """    // 1274: the estimate's price table stacks on a phone. Injected here so every
    // estimate already sent reads properly; new ones carry it in their template.
    const ITEMS_PHONE = '""" + CSS.replace('\\', '\\\\') + """';
""" + a.replace("'<style id=\"shareFix\">.howto{display:none !important}' +", "'<style id=\"shareFix\">.howto{display:none !important}' + ITEMS_PHONE +"))
open(SHARE, 'w', encoding='utf-8').write(sh)
print('patched', PATH, SHARE)
