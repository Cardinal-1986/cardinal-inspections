"""Build 1412 — the Upload signed contract sheet's Save sat under the installed app's bottom bar (29 Oct 2026,
Jacob's screenshot via Theo: "Can't scroll or click the save button as it's covered by the menu bar"). #ctUpSheet,
#apptCalSheet and #ljAsk were z-index 9600; body.standalone #pwaNav is 9990. 1273 fixed the identical bug for
#crEmailSheet (9995) and these three were never brought along. All three now match it."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(P, encoding='utf-8').read()
def one(t, old, new, n=1):
    c = t.count(old); assert c == n, (c, old[:90]); return t.replace(old, new)
s = one(s, "#apptCalSheet{position:fixed;left:0;right:0;bottom:0;z-index:9600;",
"/* 1412: 9995, above body.standalone #pwaNav (9990) — the 1273 rule; at 9600 the nav covered the buttons */\n"
"#apptCalSheet{position:fixed;left:0;right:0;bottom:0;z-index:9995;")
s = one(s, "#ctUpSheet{position:fixed;left:0;right:0;bottom:0;z-index:9600;",
"/* 1412: 9995 — Jacob could not reach Save under the installed app's nav */\n"
"#ctUpSheet{position:fixed;left:0;right:0;bottom:0;z-index:9995;")
s = one(s, "#ljAsk{position:fixed;left:0;right:0;bottom:0;z-index:9600;",
"/* 1412: 9995, above body.standalone #pwaNav (9990) */\n"
"#ljAsk{position:fixed;left:0;right:0;bottom:0;z-index:9995;")
s = one(s, ">v2026-10-29 build 1411<", ">v2026-10-29 build 1412<")
s = one(s, """  { b: 1411, d:'2026-10-29',""",
"""  { b: 1412, d:'2026-10-29', t:'Save is no longer under the menu bar', s:'In the installed app, the Upload signed contract panel\\u2019s Save button was hidden behind the bottom menu bar. That panel, the Add to calendar prompt and the Leads question now sit above the bar.' },
  { b: 1411, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1412')
