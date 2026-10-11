"""Build 1308 — the P badge on Leads & Jobs is orange too (Theo: "Make the p the same color").

1307 made Prospect's stripe #ff7a00; the round P badge stayed Cardinal red. LJ_SOLID's
Prospect is now the stripe's #ff7a00. White on that orange is 2.61:1 (under the floor),
so LJ_INK's Prospect goes to the dark ink every light stage already uses: #15171b, 6.87:1.
The badge appears on the card (ljCardHtml) and the lead's detail pane; both read these maps.

Usage: python3 patch_1308.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)
A = "var LJ_SOLID = { Lead:'#FFE600', Prospect:'#c8202e', OnHold:'#c8862b',"
B = "/* 1308: the P badge matches 1307's orange stripe (Theo). */\nvar LJ_SOLID = { Lead:'#FFE600', Prospect:'#ff7a00', OnHold:'#c8862b',"
src = pl.sub(src, A, B)
A = "var LJ_INK = { Lead:'#15171b', Prospect:'#ffffff', OnHold:'#15171b',"
B = "/* 1308: white on the new orange is 2.61:1, so Prospect takes the dark ink, 6.87:1. */\nvar LJ_INK = { Lead:'#15171b', Prospect:'#15171b', OnHold:'#15171b',"
src = pl.sub(src, A, B)
A = ">v2026-10-11 build 1307<button"; B = ">v2026-10-11 build 1308<button"; src = pl.sub(src, A, B)
A = "var CHANGELOG = [\n"
B = """var CHANGELOG = [
  { b: 1308, d: '2026-10-11', t: 'The P badge is orange to match its stripe',
    s: 'On Leads & Jobs the round P on a Prospect card was red while its stripe had just turned orange. The P is now the same orange, with a dark letter so it stays easy to read.' },
"""
src = pl.sub(src, A, B)
pl.write_atomic(PATH, src)
print('patched', PATH)
