"""Build 1391 — checks that could never pass (the 23 Oct audit). Thirteen sites in index.html
compared `typeof X` against the string 'async function'. typeof never returns that — an async
function's typeof is 'function' — so every one of them was permanently false. OC Colors could not
upload a photograph ("Image tools unavailable"), filing a Scope of Loss never offered the read, the
gallery and the bulk-reassign list never redrew, the photo editor's ⬇ Device button did nothing,
Production's punch tick skipped the shared layer (and its offline outbox), and two Admin Health
extensions never hooked in. Twelve become 'function'. The thirteenth, cr-suf's readScopeOfLoss wrapper,
is RETIRED on purpose rather than switched on: 657's routeScopeToReader() already runs prepare() and the
storage route, so turning the wrapper on would prepare every scope twice.
api/supplement.js: photo mode named `packLines`, which was never defined (the menu is `packMenu`), and
the draft letter's citation check read `items` from a block-scoped const that had gone out of scope —
both ReferenceErrors, the second one AFTER the model had been paid for."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
api = sys.argv[2] if len(sys.argv) > 2 else 'api/supplement.js'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""if(typeof window.readScopeOfLoss !== 'async function') return false;""",
"""/* 1391: RETIRED. This guard compared typeof against the string async-function, which typeof never returns, so
   the wrapper below has never once been installed. 657's routeScopeToReader() now runs prepare() and
   the storage route itself; installing this would prepare every scope twice. Returning true ends the retry. */
return true;""")
assert s.count("'async function'") == 12, s.count("'async function'")
s = s.replace("=== 'async function'", "=== 'function'").replace("!== 'async function'", "!== 'function'")
assert s.count("'async function'") == 0

one(">v2026-10-22 build 1390<", ">v2026-10-23 build 1391<")
one("""  { b: 1390, d:'2026-10-22',""",
"""  { b: 1391, d:'2026-10-23', t:'Thirteen switches that were stuck off', s:'A check used in thirteen places could never come out true, so each thing behind it quietly never ran. Fixed: uploading a photo to OC Colors (it always said image tools were unavailable); the \\u201cRead it now?\\u201d offer after filing a Scope of Loss; the photo gallery and the client list redrawing after you add photos, save a caption, reassign or archive; the \\u2b07 Device button in the photo editor on CompanyCam photos; and ticking a punch item on Production, which now goes through the same save as everywhere else \\u2014 including holding it when there is no signal. On the Supplement Desk, Draft letter and the photo list no longer fail with \\u201cnot defined\\u201d.' },
  { b: 1390, d:'2026-10-22',""")
pl.write_atomic(path, s)

a = open(api, encoding='utf-8').read()
def oneA(old, new):
    global a
    n = a.count(old); assert n == 1, (n, old[:90]); a = a.replace(old, new)
oneA("""'Recognized items, and the ONLY things you may cite:\\n' + packLines + '\\n\\n' +""",
     """'Recognized items, and the ONLY things you may cite:\\n' + packMenu + '\\n\\n' +""")
oneA("""      const allowed = new Set();
      items.forEach(i => {""",
"""      const allowed = new Set();
      /* 1391: `items` is a const inside the draft branch above and is out of scope here — this was a
         ReferenceError on every letter, after the model had already been paid for. */
      (Array.isArray(body.items) ? body.items.filter(i => i && i.item) : []).forEach(i => {""")
pl.write_atomic(api, a)
print('ok 1391')
