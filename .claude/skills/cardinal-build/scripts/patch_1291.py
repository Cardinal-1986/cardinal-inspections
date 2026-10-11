"""Build 1291 — the Billed / Collected / Balance tiles go flat (both themes).

The tiles inside Invoices & Payments (.crji-nums>span) were the last puffy thing on
the client page: a neumorphic inset shadow drawn from --crji-tile-lo/--crji-tile-hi.
Edited AT SOURCE (not out-specified): the inset is replaced by a 1px outline in the
tile's own --crji-tile-lo tone, so each theme keeps its own token and nothing new is
invented. The ground stays on --crji-tile (the 1216 lesson).

Usage: python3 patch_1291.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)
OLD = ".crji-nums>span{display:flex;flex-direction:column;gap:2px;background:var(--crji-tile,#1b1f24);border-radius:11px;padding:9px 11px;box-shadow:inset 3px 3px 7px var(--crji-tile-lo,#0d0f12), inset -3px -3px 7px var(--crji-tile-hi,#23282e);}"
NEW = ".crji-nums>span{display:flex;flex-direction:column;gap:2px;background:var(--crji-tile,#1b1f24);border-radius:10px;padding:9px 11px;border:1px solid var(--crji-tile-lo,#0d0f12);box-shadow:none;} /* 1291: flat, the drawer's style */"
src = pl.sub(src, OLD, NEW)
src = pl.sub(src, '">v2026-10-10 build 1290<button', '">v2026-10-10 build 1291<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1290,",
  "var CHANGELOG = [\n"
  "  { b: 1291, d: '2026-10-10', t: 'Flat billing tiles',\n"
  "    s: 'On a client page, the Billed, Collected and Balance boxes inside Invoices &amp; Payments are flat now, with a thin outline instead of the pressed-in shadow, so they match the rest of the cleaned-up page in both light and dark. The numbers and their colours are unchanged.' },\n"
  "  { b: 1290,")
pl.write_atomic(PATH, src)
print('patched 1291')
