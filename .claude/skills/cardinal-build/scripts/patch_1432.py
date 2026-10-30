"""Build 1432 — the Supplement card is retired (30 Oct 2026). Theo: "Retire card".

The card (cr-sp-script, 2026-07) was meant to sit on an insurance client's Overview: supplement status, filed vs
approved dollars, and a "File a supplement" sheet that wrote insurance_claims directly. It NEVER rendered:
#cr-sp-mount was inserted straight into #tab-overview, whose hide rule only spares its allow-list (CLAUDE.md's
worst offender), so the card was hidden on every insurance job since it shipped. Meanwhile the Supplement Desk
(supplement.html, 668+) became where supplements are filed; its mirror trigger keeps the claim's
supplement_status / filed / approved columns current (25 claims 'none', 1 'filed', measured 30 Oct).

Removed: the card, its filing sheet (#cr-sp-modal), its stylesheet (cr-sp-styles), window.CardinalSupplement (no
consumer anywhere), and supplement_notes from the claim cache's select (the card was its only reader).
KEPT, byte for byte: the module's other job -- ensureSolCard(), which puts the Scope of Loss card on an insurance
client page -- and its scan/observer, so the body-observer count does not move.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)

# 1) the stylesheet
i = s.index('<style id="cr-sp-styles">'); j = s.index('</style>', i) + len('</style>')
assert s.count('<style id="cr-sp-styles">') == 1 and s[j] == '\n'
s = s[:i] + s[j + 1:]

# 2) the script: keep isInsurance, ensureSolCard and the scan; drop everything else
a = s.index('<script id="cr-sp-script">'); b = s.index('</script>', a) + len('</script>')
blk = s[a:b]
assert s.count('<script id="cr-sp-script">') == 1
def grab(start, end):
    x = blk.index(start); y = blk.index(end, x) + len(end); return blk[x:y]
ISINS = grab('function isInsurance(pr){', "return window.projClaimType(pr) === 'insurance';\n}")
SOL   = grab('function ensureSolCard(){', "console.warn('[supp] solCard:', e); }\n}\n}")
START = grab('function start(){', "else start();")
assert "try{ ensureSolCard(); render(); }catch(e){ console.warn('[supp]', e); }" in blk
new = ('<script id="cr-sp-script">\n(function(){\n\'use strict\';\n'
  '/* 1432 (Theo, 30 Oct: "Retire card"): the Supplement card that lived here never rendered -- #cr-sp-mount\n'
  '   went straight into #tab-overview and was never on its allow-list -- and the Supplement Desk\n'
  '   (supplement.html, 668+) is where supplements are filed; its mirror trigger keeps the claim\'s supplement\n'
  '   columns current. The card, its filing sheet and window.CardinalSupplement are gone. What stays is this\n'
  '   module\'s other job: putting the Scope of Loss card on an insurance client page. */\n'
  + ISINS + '\n' + SOL + '\n'
  'var scheduled = false;\nfunction scan(){\nif(scheduled) return;\nscheduled = true;\nrequestAnimationFrame(function(){\n'
  'scheduled = false;\ntry{ ensureSolCard(); }catch(e){ console.warn(\'[supp]\', e); }\n});\n}\n'
  + START + '\n})();\n</script>')
s = s[:a] + new + s[b:]

# 3) the claim cache no longer fetches the card's only column
s = one(s, "   shape() plus cr-sp's supplement_notes and cr-ic's supplement_filed_at.",
           "   shape() plus cr-ic's supplement_filed_at (1432: supplement_notes went with the retired Supplement card).")
s = one(s, "'supplement_notes,supplement_filed_at');", "'supplement_filed_at');")

s = one(s, ">v2026-10-30 build 1431<", ">v2026-10-30 build 1432<")
s = one(s, """  { b: 1431, d:'2026-10-30',""",
"""  { b: 1432, d:'2026-10-30', t:'The old Supplement card is retired', s:'The Supplement card on an insurance client page is gone. It had never actually appeared on screen, and the Supplement Desk is where supplements are filed and tracked; it keeps each claim\\u2019s supplement status up to date, and that status still shows in the Insurance lists. Nothing you could see changes.' },
  { b: 1431, d:'2026-10-30',""")
pl.write_atomic(P, s)
print('ok 1432')
