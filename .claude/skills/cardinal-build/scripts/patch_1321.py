"""Build 1321 — Scottie's lock, the app's last half. field_role.sql was applied on 12 Oct
(Theo: "run it"): the database no longer counts Scottie as full access. This takes him out
of the app's own mirror of that list (window.is_full_access), so the app and the database
agree. His Production board, punch cards, crews and photos are unchanged — they come from
is_field() in the database and isFieldUser() in the app.
Usage: python3 patch_1321.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)
def one(old, new):
    global src
    assert src.count(old) == 1, (old[:90], src.count(old))
    src = src.replace(old, new)
one("""  // ── is_full_access(): admins + production crew
  window.is_full_access = function () {
    var FULL = [
      'theo@cardinalrenovations.net',
      'joan@cardinalrenovations.net',
      'curtis@cardinalrenovations.net',
      'scottie@cardinalrenovations.net',
    ];""",
"""  // ── is_full_access(): admins + Curtis. 1321: mirrors the database — Scottie is a
  //    FIELD user (is_field() / isFieldUser()) since field_role.sql, 12 Oct 2026.
  window.is_full_access = function () {
    var FULL = [
      'theo@cardinalrenovations.net',
      'joan@cardinalrenovations.net',
      'curtis@cardinalrenovations.net',
    ];""")
one(">v2026-10-12 build 1320<button", ">v2026-10-12 build 1321<button")
one("var CHANGELOG = [", """var CHANGELOG = [
  { b: 1321, d:'2026-10-12', t:'Scottie\\u2019s access, finished', s:'Scottie\\u2019s account now sees only Production in the database as well as on screen: every job on the board, punch cards, crews and photos \\u2014 and no estimates, contracts, invoices or payments. Theo, Joan and Curtis are unchanged.' },""")
pl.write_atomic(PATH, src)
print('1321 applied')
