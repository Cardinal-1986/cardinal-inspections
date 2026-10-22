"""Build 1385 — the roofing agreement, tidied (Theo, 22 Oct, on screenshots of a live agreement):
"Redundancy on tear off. The terms shouldn't be there it's messy."
1. The spec sheet asked how many layers twice: 1A "Remove existing roofing [n] layers to roof deck"
   (a dropdown) and 12 "Existing Layers — Number / type of layers ____". 12 is gone; Roof Pitch is 12.
2. The three construction agreements (roofing, siding, gutters) printed a "Terms" page whose two
   bullets told staff where the printed T&C master lives and restated that the papers form the whole
   agreement. The body already says both, beside the cancellation notice. The heading and bullets
   are dropped for an agreement that carries its own signature block; the Acceptance note stays.
   Estimates, invoices and the plain service contract are untouched. Already-saved agreements keep
   the HTML they were saved with."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""<div class="specsec"><h3>12. Existing Layers</h3>
<div class="specline">Number / type of layers <span class="opts" data-opts="layers">&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;</span></div>
</div>

<div class="specsec"><h3>13. Roof Pitch</h3>""",
"""<div class="specsec"><h3>12. Roof Pitch</h3>""")

one("""    if(body && String(body).indexOf('data-sig') !== -1) out = out.replace(SIGN_FOOTER, '');""",
"""    if(body && String(body).indexOf('data-sig') !== -1){
      out = out.replace(SIGN_FOOTER, '');
      /* 1385 (Theo: "The terms shouldn't be there it's messy"): the three construction agreements
         already point at the printed T&C master beside the cancellation notice, so the separate
         Terms page only said it again. Drop its heading and bullets; keep the Acceptance note. */
      out = out.replace(/<h2 class="sec page-break">Terms<\\/h2>\\s*[\\s\\S]*?(?=<[d]iv class="note"><b>Acceptance\\.<\\/b>)/, '');
    }""")

one("""  collapse('layers', _ck.layers);""",
"""  collapse('layers', _ck.layers);
  /* 1385: the roofing agreement asks for layers once now — the Decking 1A dropdown — so the
     inspection's count pre-selects it ("2 Layers" -> 2, "3+ Layers (Code Violation)" -> 3).
     data-crsel-value is the existing pre-select hook (891); a saved choice still wins. */
  (function(lay){
    var m = /^\\s*(\\d+)/.exec(String(lay || ''));
    if(!m) return;
    tpl = tpl.replace('<select class="crsel" data-crsel="qty" contenteditable="false" aria-label="Layers to remove">',
      '<select class="crsel" data-crsel="qty" contenteditable="false" aria-label="Layers to remove" data-crsel-value="' + m[1] + '">');
  })(_ck.layers);""")

one(">v2026-10-22 build 1384<", ">v2026-10-22 build 1385<")
one("""  { b: 1384, d:'2026-10-22',""",
"""  { b: 1385, d:'2026-10-22', t:'Tidier construction agreements', s:'The roofing agreement no longer asks for the number of existing layers twice: it is picked once, in Decking (\\u201cRemove existing roofing \\u2026 layers to roof deck\\u201d), and Roof Pitch is now section 12. The roofing, siding and gutter agreements also no longer print a separate Terms page repeating where the printed Terms and Conditions live; that line is still in the agreement beside the cancellation notice. Agreements already saved are unchanged.' },
  { b: 1384, d:'2026-10-22',""")
pl.write_atomic(path, s)
print('ok 1385')
