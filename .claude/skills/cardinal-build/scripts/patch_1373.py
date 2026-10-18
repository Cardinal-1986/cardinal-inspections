"""Build 1373 — five clutter fixes on the phone (Theo, 18 Oct: "all 5", from the rendered before/after preview).
1. The Job Menu's 0 counts are hidden (.jan.zero keeps its space, so tiles do not shift when a count arrives).
2. The header's Work Orders button goes on a phone — it shows only on an open job and opens that job's Work Orders
   tab, which the Job Menu's own Work Orders tile already does. It was wrapping onto a line of its own.
3. The Roof Pre-Install Guide row is written AFTER the Job Menu. On a phone both carry order:2 (1225), so the one
   first in the page won and the guide sat between the stage bar and the menu. Desktop's explicit orders are unchanged.
4. The Ask button is a round ✦ on a phone (its "Ask" word is a separate span the phone rule hides; the accessible name
   was always aria-label "Ask the assistant").
5. Home's pipeline and Accounts Receivable print $0 for nothing; fmtMoney(0) prints "--", which read as broken."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1 + 2 + 4: styles, beside the job menu's own zero rule
one(""".jabox .jan.zero{color:#c9c9c9;}""",
""".jabox .jan.zero{color:#c9c9c9;}
/* 1373 (Theo's pick): a zero count is not news. The space stays, so a count arriving does not shift the tile. */
#acxMount .jabox .jan.zero{visibility:hidden;}
@media (max-width:760px){
  /* the job's Work Orders tab is already a Job Menu tile; on a phone this button wrapped onto its own line */
  header.site #woQuick{--cr-stack:"1373 on a phone the Job Menu's Work Orders tile replaces this header shortcut";display:none !important;}
  /* the Ask button sat over the right-hand tiles: a round button with just the star */
  #cr-ai-fab{--cr-stack:"1373 a round star on a phone; the pill stays on wider screens";width:52px;height:52px;padding:0;justify-content:center;font-size:22px;}
  #cr-ai-fab .cr-ai-lbl{display:none;}
}""")

# 3: the guide row after the Job Menu
GUIDE = """  html += (window.CardinalGuide && !window.CardinalGuide.isNonRoofOnly(pr)) ? ('<div class="db-guiderow"><span class="dbg-t">Roof Pre-Install Guide</span><button class="btn ghost" data-cr-guide-send="' + esc(pr.id) + '">Email to client</button></div>') : '';"""
one(GUIDE + "\n", "")
one("""      jt(dbIc('workorder'), 'Work Orders', '', 'workorders') +
    '</div></div>';""",
"""      jt(dbIc('workorder'), 'Work Orders', '', 'workorders') +
    '</div></div>';
  /* 1373: written after the Job Menu (was before it). On a phone both are order:2, so page order decides. */
""" + GUIDE)

# 4: the Ask word in its own span
one("""<button id="cr-ai-fab" type="button" aria-label="Ask the assistant">&#10022; Ask</button>""",
    """<button id="cr-ai-fab" type="button" aria-label="Ask the assistant">&#10022;<span class="cr-ai-lbl"> Ask</span></button>""")

# 5: $0, not "--"
one("""      '<span class="pmoney">' + fmtMoney(money) + '</span></button>';""",
    """      '<span class="pmoney">' + (money ? fmtMoney(money) : '$0') + '</span></button>';   /* 1373: fmtMoney(0) is "--" */""")
one("""      '<div class="arbig">' + fmtMoney(total) +""",
    """      '<div class="arbig">' + (total ? fmtMoney(total) : '$0') +   /* 1373 */""")

# 1372's helper took a name eight other blocks use (gate_dupes): give it its own
one("""  var put = function(id, v){ var el = /** @type {HTMLInputElement|null} */ (document.getElementById(id)); if(el) el.value = v; };
  put('pfName', pr.name || ''); put('pfAddress', pr.address || ''); put('pfPhone', pr.phone || ''); put('pfEmail', pr.email || '');
  put('pfSource', 'Repeat customer');""",
    """  var pfPut = function(id, v){ var el = /** @type {HTMLInputElement|null} */ (document.getElementById(id)); if(el) el.value = v; };
  pfPut('pfName', pr.name || ''); pfPut('pfAddress', pr.address || ''); pfPut('pfPhone', pr.phone || ''); pfPut('pfEmail', pr.email || '');
  pfPut('pfSource', 'Repeat customer');""")

one(">v2026-10-18 build 1372<button", ">v2026-10-18 build 1373<button")
one("""  { b: 1372, d:'2026-10-18',""",
"""  { b: 1373, d:'2026-10-18', t:'A calmer phone screen', s:'On a client’s page the Job Menu no longer shows a 0 on every tile with nothing in it. On a phone the extra Work Orders button under the header is gone, because Work Orders is already a tile in the menu. The Roof Pre-Install Guide row now sits below the Job Menu instead of above it. The Ask button is a small round star that no longer covers the tiles. On Home, the pipeline and Accounts Receivable show $0 instead of two dashes.' },
  { b: 1372, d:'2026-10-18',""")
pl.write_atomic(path, s)
print('ok 1373')
