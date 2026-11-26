"""Build 1487: Jerry Wamsley's work email is jwamsley@cardinalrenovations.net (Theo, 25 Nov 2026:
"create an [email] for Jerry Wamsley jwamsley@", then "Yes" to switching his CRM email to it).

His sign-in (auth user since 18 Nov), team_profiles row, leads and push device were already on
jwamsley@. The app's code still named jerry@jerrywamsley.com in two hardcoded lists, so:
  - Reassign and the new-lead rep picker offered him under the OLD address (picking him there
    assigned the job to an email nobody signs in with), and rptRepName could not name him.
  - The Ask button (AI_PEOPLE) and the Assistant server (api/assistant.js PEOPLE) did not know his
    real login, so he could not use the Assistant from build 1484.
Both lists now carry jwamsley@. api/_staff.js is untouched: jwamsley@ is on the domain.

Run from the repo root:  python .claude/skills/cardinal-build/scripts/patch_1487.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

OLD, NEW = 'jerry@jerrywamsley.com', 'jwamsley@cardinalrenovations.net'

def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)

# --- index.html
P = 'index.html'
s = pl.load(P)
s = one(s, "  { name:'Jerry Wamsley',       email:'jerry@jerrywamsley.com', tag:'wamsley' },\n",
           "  { name:'Jerry Wamsley',       email:'jwamsley@cardinalrenovations.net', tag:'wamsley' },   /* 1487: his work email */\n")
s = one(s, "'joan@cardinalrenovations.net':1, 'jerry@jerrywamsley.com':1 };",
           "'joan@cardinalrenovations.net':1, 'jwamsley@cardinalrenovations.net':1 };   /* 1487: Wamsley signs in as jwamsley@ */")
# The "type more" hint found Wamsley for "@jerry" only through his old email prefix ("jerry@"). With
# jwamsley@ it would offer Vera alone, as if "@jerry" meant Vera. It now also matches a member's real
# first name, so "@jerry" still says it fits 2 people: Vera, Wamsley. Untagged members are unchanged
# (their firstOf already IS the first name).
s = one(s, "      var f = firstOf(mbr).toLowerCase(), p = (mbr.email || '').split('@')[0].toLowerCase();\n"
           "      return (!!f && f.indexOf(mn) === 0) || (!!p && p.indexOf(mn) === 0);\n",
           "      var f = firstOf(mbr).toLowerCase(), p = (mbr.email || '').split('@')[0].toLowerCase();\n"
           "      var n = (mbr.name || '').trim().split(/\\s+/)[0].toLowerCase();   /* 1487: the real first name too */\n"
           "      return (!!f && f.indexOf(mn) === 0) || (!!p && p.indexOf(mn) === 0) || (!!n && n.indexOf(mn) === 0);\n")
s = one(s, ">v2026-11-23 build 1486<", ">v2026-11-25 build 1487<")
s = one(s, "var CHANGELOG = [\n  { b: 1486,",
"var CHANGELOG = [\n"
"  { b: 1487, d:'2026-11-25', t:'Jerry Wamsley on his work email', s:'Jerry Wamsley is now jwamsley@cardinalrenovations.net everywhere in the app. Picking him in Reassign or on a new lead gives him the job under the email he signs in with, his name shows on his jobs, and he can use the Ask button.' },\n"
"  { b: 1486,")
assert OLD not in s, 'old address still in index.html'
pl.write_atomic(P, s)

# --- api/assistant.js
A = 'api/assistant.js'
a = pl.load(A)
a = one(a, "  'jerry@jerrywamsley.com':        { name: 'Jerry', owner: false, sales: true },\n",
           "  'jwamsley@cardinalrenovations.net': { name: 'Jerry', owner: false, sales: true },   /* 1487: his work email */\n")
assert OLD not in a, 'old address still in api/assistant.js'
pl.write_atomic(A, a)

# --- the older gates follow him to the new address
G = '.claude/skills/cardinal-build/scripts/'
for g, a1, b1 in [
    ('gate_1485.mjs', "const W = 'jerry@jerrywamsley.com',", "const W = 'jwamsley@cardinalrenovations.net',"),
    ('gate_1484.mjs', "const REP = 'jerry@jerrywamsley.com',", "const REP = 'jwamsley@cardinalrenovations.net',"),
    ('gate_1327.mjs', "boot('jerry@jerrywamsley.com', false)", "boot('jwamsley@cardinalrenovations.net', false)"),
]:
    t = pl.load(G + g)
    t = one(t, a1, b1)
    pl.write_atomic(G + g, t)
print('ok 1487')
