"""Build 1310 — three home controls under the 44px floor (gate_944 red since 1306).

My 1306 wrap made the iPad home taller, so gate_944's walk scrolled one step further and
reached the client-history header for the first time: the search box (43px), "CSV"
(25px) and "Select" (25px). They were always this size; the walk just never reached
them. Fixed at the three source rules with min-height:44px — no override layer.

Usage: python3 patch_1310.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)
A = "  border-radius:6px;min-width:260px;flex:1;max-width:420px;background:#fff;\n}"
B = "  border-radius:6px;min-width:260px;flex:1;max-width:420px;background:#fff;\n  min-height:44px;   /* 1310: was 43px, the tap floor */\n}"
src = pl.sub(src, A, B)
A = ".cr-csv-btn{background:transparent;border:1px solid #c8202e;color:#8f1620;padding:5px 10px;"
B = ".cr-csv-btn{min-height:44px;background:transparent;border:1px solid #c8202e;color:#8f1620;padding:5px 10px;"
src = pl.sub(src, A, B)
A = "#cr-bulk-toggle{background:transparent;border:1px solid #4a6fa5;"
B = "#cr-bulk-toggle{min-height:44px;background:transparent;border:1px solid #4a6fa5;"
src = pl.sub(src, A, B)
A = ">v2026-10-11 build 1309<button"; B = ">v2026-10-11 build 1310<button"; src = pl.sub(src, A, B)
A = "var CHANGELOG = [\n"
B = """var CHANGELOG = [
  { b: 1310, d: '2026-10-11', t: 'Client list buttons are big enough to tap',
    s: 'Above the client list on the home screen, the search box and the CSV and Select buttons were a little under the size a thumb can hit reliably. All three are full size now.' },
"""
src = pl.sub(src, A, B)
pl.write_atomic(PATH, src)
print('patched', PATH)
