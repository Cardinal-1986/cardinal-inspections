"""Build 1307 — on the Leads list, Prospect's stripe is bright orange (Theo, screenshot:
"Leads and prospects look like the same color... make that left border maybe a bright orange").

LJ_SPINE had Lead lemon #FFE600 and Prospect #ffd84d — two yellows a few points apart,
indistinguishable on a phone in daylight. Prospect's spine is now #ff7a00, the orange
family of the pipeline's P (#F08A24), brighter so it carries on the navy card.
Only the stripe moves: the P badge (LJ_SOLID), its ink and every other stage are unchanged.

Usage: python3 patch_1307.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)
A = "var LJ_SPINE = { Lead:'#FFE600', Prospect:'#ffd84d', OnHold:'#ff9f43',"
B = "/* 1307: Prospect was #ffd84d, a second yellow beside Lead's lemon — Theo could not tell\n   them apart. Bright orange now, the pipeline P's family. */\nvar LJ_SPINE = { Lead:'#FFE600', Prospect:'#ff7a00', OnHold:'#ff9f43',"
src = pl.sub(src, A, B)
A = ">v2026-10-11 build 1306<button"; B = ">v2026-10-11 build 1307<button"; src = pl.sub(src, A, B)
A = "var CHANGELOG = [\n"
B = """var CHANGELOG = [
  { b: 1307, d: '2026-10-11', t: 'Prospects have an orange stripe on the Leads list',
    s: 'On Leads & Jobs, a Lead and a Prospect both had a yellow stripe down the left of the card and looked the same. A Prospect\\u2019s stripe is now bright orange, so the two read apart at a glance. Nothing else on the card changes.' },
"""
src = pl.sub(src, A, B)
pl.write_atomic(PATH, src)
print('patched', PATH)
