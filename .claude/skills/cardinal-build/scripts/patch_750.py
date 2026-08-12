# -*- coding: utf-8 -*-
"""Build 750 — colour dropdowns on the roofing agreement.

   Theo: "Can you make drop downs for oc colors and drip edge colors?"

   TWO LISTS, AND THEY COME FROM COMPLETELY DIFFERENT PLACES. Audited first:

     * OC SHINGLE COLOURS ARE REAL DATA AND ALREADY LOADED. `cr-occ-script`
       queries `oc_colors` with `.eq('hidden', false).order('sort_order')` and
       caches the rows in a module-local `COLORS`. So this build does NOT open a
       second pipeline onto that table -- it adds a `list()` accessor to
       `window.CardinalColors` (which previously exported only open/close/reload)
       and the document wiring calls it. `load()` was checked and touches VIEW
       nowhere, so it is safe to call with no hub mounted. Reusing it also means
       the hidden filter and the sort order are honoured for free: Shasta White
       is the one hidden colour and stays out of the dropdown, which is Theo's
       settled decision, not a coincidence.

     * DRIP EDGE / GUTTER APRON COLOURS EXIST NOWHERE. All 45 "drip edge" hits in
       index.html are Resource Library prose about Ohio code -- there is no trim
       colour table, list or constant anywhere in the repo. I refused to invent
       one silently, because it goes on a signed contract, and asked. Theo picked
       the standard aluminium trim set, so TRIM_COLORS is a NEW hardcoded list
       and is labelled as such: it is a starting list, not gospel, and it carries
       "Other" so a rep is never blocked by a colour we did not anticipate.

   ⚠️ THE HARD PART IS PERSISTENCE, NOT THE MARKUP. A <select>'s chosen value is
   a PROPERTY, not an attribute. `serializeFrame()` saves a contract by calling
   `cloneNode(true)` -- and a clone does NOT carry the runtime selection. Ship the
   obvious version and every dropdown silently reverts to blank the next time the
   contract is opened, with nothing in the DOM to show it ever held a value. So
   the change handler writes the `selected` ATTRIBUTE onto the chosen option and
   strips it from the rest. That is the same shape as 748's checkboxes, which
   persist because their state lives in textContent.

   ⚠️ THE OPTIONS THEMSELVES MUST SERIALIZE TOO, and that is deliberate. Once a
   contract is saved it carries its own frozen option list, so reopening it a year
   later shows the colours as they were offered on the day it was signed, even if
   the catalogue has moved on. A contract is a record, not a live view.

   ⚠️ CONTENTEDITABLE. `table.meta td:not(.k)` is in EDITABLE_SELECTOR, so every
   one of these selects lands inside an editable cell with a caret in it -- the
   same trap 748 hit. Each select carries contenteditable="false" so the browser
   treats it as an atomic control rather than text to type over, and the gate
   drives a real change event inside the real editor to prove it.
"""
import sys, re
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

SRC = '/home/user/cardinal-inspections/index.html'
src = pl.load(SRC)
orig = src

def one(source, old, new):
    assert source.count(old) == 1, 'anchor not unique (%d): %r' % (source.count(old), old[:90])
    return source.replace(old, new)

def in_tpl(source, name, old, new):
    d = re.search(r'(?:var|const)\s+%s\s*=\s*`' % name, source)
    assert d, 'no template ' + name
    st = d.end(); en = source.index('`;', st)
    blk = source[st:en]
    assert blk.count(old) == 1, '%s: expected 1 of %r, found %d' % (name, old[:70], blk.count(old))
    return source[:st] + blk.replace(old, new) + source[en:]

# ── 1. cr-occ-script gains a list() accessor — no second query on oc_colors ──
old = """window.CardinalColors = Object.assign(window.CardinalColors || {}, {
  open: open,
  close: close,"""
new = """window.CardinalColors = Object.assign(window.CardinalColors || {}, {
  open: open,
  close: close,
  /* 750: the shingle-colour dropdown on the roofing agreement reads THIS, so
     `oc_colors` still has exactly one reader in the app. load() touches VIEW
     nowhere, so it is safe with no hub mounted, and going through it means the
     dropdown inherits the hidden filter and the sort order rather than
     re-stating them -- Shasta White is hidden and stays out by construction. */
  list: async function(){
    if(!COLORS.length){ try{ await load(); }catch(_){ } }
    return COLORS.map(function(c){
      return { name: c.name, status: c.status, line: c.product_line };
    });
  },"""
src = one(src, old, new)

# ── 2. the trim palette + the wiring, beside wireCheckboxes ─────────────────
old = "function wireCheckboxes(doc){"
new = """/* 750: aluminium trim colours for drip edge and gutter apron.
   ⚠️ THIS LIST IS NOT DERIVED FROM ANYTHING -- it is the one piece of data in
   this build that had no source in the repo. Drip edge colours appear nowhere:
   no table, no constant, and all 45 "drip edge" hits in this file are Resource
   Library prose about Ohio code. Rather than invent a list quietly onto a signed
   contract, it was put to Theo, who chose the standard aluminium stock range.
   Treat it as a STARTING list: if a supplier's range differs, this is the single
   place to change, and 'Other' means a rep is never blocked in the meantime. */
var TRIM_COLORS = ['White', 'Almond', 'Brown', 'Royal Brown', 'Musket Brown',
                   'Wicker', 'Clay', 'Black', 'Bronze', 'Mill finish', 'Other'];

/* ---------- colour dropdowns (persist as a `selected` ATTRIBUTE) ---------- */
async function wireColorSelects(doc){
  var sels = doc.querySelectorAll('select[data-crsel]');
  if(!sels.length) return;

  /* Fetch once per document, and only if something actually needs filling. */
  var occ = null;
  for(var i = 0; i < sels.length; i++){
    if(sels[i].getAttribute('data-crsel') === 'occ' && sels[i].options.length <= 1){
      try{ occ = await window.CardinalColors.list(); }catch(_){ occ = []; }
      break;
    }
  }

  sels.forEach(function(sel){
    /* Populate ONLY an empty one. A saved contract already carries its own
       options, frozen as they were offered on the day it was signed, and
       refilling would silently restate today's catalogue on an old record. */
    if(sel.options.length <= 1){
      var list = sel.getAttribute('data-crsel') === 'occ'
        ? (occ || []).map(function(c){
            return c.status === 'discontinued' ? c.name + ' (discontinued)' : c.name;
          })
        : TRIM_COLORS;
      var html = '<option value="">\\u2014 select \\u2014</option>';
      for(var k = 0; k < list.length; k++){
        var v = String(list[k]).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        html += '<option value="' + v + '">' + v + '</option>';
      }
      sel.innerHTML = html;
    }

    /* Restore the saved choice: the ATTRIBUTE is the record, the property is not. */
    var chosen = sel.querySelector('option[selected]');
    if(chosen) sel.value = chosen.value;

    if(sel.getAttribute('data-crsel-wired')) return;
    sel.setAttribute('data-crsel-wired', '1');
    sel.addEventListener('change', function(){
      /* ⚠️ WITHOUT THIS THE CHOICE IS LOST ON SAVE. serializeFrame() clones the
         document, and cloneNode(true) copies attributes, not the live value of a
         form control. Writing the attribute is what makes a picked colour part
         of the contract rather than a screen state. */
      for(var k = 0; k < sel.options.length; k++) sel.options[k].removeAttribute('selected');
      if(sel.selectedIndex >= 0 && sel.value) sel.options[sel.selectedIndex].setAttribute('selected', 'selected');
    });
  });
}

function wireCheckboxes(doc){"""
src = one(src, old, new)

# call it where every other doc wiring is called
src = one(src, "      wireCheckboxes(doc);\n",
               "      wireCheckboxes(doc);\n      wireColorSelects(doc);\n")

# serializeFrame must strip the wired flag, exactly as it does for data-cbx
src = one(src,
  "  clone.querySelectorAll('.cbx[data-cbx]').forEach(function(el){ el.removeAttribute('data-cbx'); });",
  "  clone.querySelectorAll('.cbx[data-cbx]').forEach(function(el){ el.removeAttribute('data-cbx'); });\n"
  "  /* 750: same reason as data-cbx above \\u2014 drop the wired marker so a reopened\n"
  "     document re-binds. The `selected` attribute is left alone: it IS the answer. */\n"
  "  clone.querySelectorAll('select[data-crsel-wired]').forEach(function(el){ el.removeAttribute('data-crsel-wired'); });")

# ── 3. the CSS, beside the .cbx rule ───────────────────────────────────────
css_old = ".cbx{cursor:pointer;font-size:13pt;user-select:none;}"
css_new = """.cbx{cursor:pointer;font-size:13pt;user-select:none;}
/* 750: colour dropdowns. Sized to sit inline in a spec row and to print like a
   filled field rather than a web control -- a contract should not look like a
   form on paper. */
.crsel{font:inherit;font-size:10.5pt;padding:2px 6px;border:1px solid var(--line);
  border-radius:3px;background:#fff;color:inherit;max-width:100%;}
@media print{
  .crsel{appearance:none;-webkit-appearance:none;border:0;border-bottom:0.5pt solid #555;
    border-radius:0;padding:0 2px;background:transparent;}
}"""
assert '`' not in css_new and '${' not in css_new, 'BUG_CLASSES 38: no backtick may enter a template literal'
src = in_tpl(src, 'ESTIMATE_BASE_RAW', css_old, css_new)

# ── 4. the three fields Theo named ─────────────────────────────────────────
SEL = ('<select class="crsel" data-crsel="%s" contenteditable="false" '
       'aria-label="%s"><option value="">&#8212; select &#8212;</option></select>')

src = in_tpl(src, 'ROOF_AGREEMENT_BODY',
  '<td>A. Drip edge colour <span class="ph">[colour]</span> (rakes)<br>'
  'B. Gutter apron colour <span class="ph">[colour]</span> (eaves)</td>',
  '<td>A. Drip edge colour ' + (SEL % ('trim', 'Drip edge colour')) + ' (rakes)<br>'
  'B. Gutter apron colour ' + (SEL % ('trim', 'Gutter apron colour')) + ' (eaves)</td>')

src = in_tpl(src, 'ROOF_AGREEMENT_BODY',
  '<td>A. Style <span class="ph">[style]</span><br>B. Colour <span class="ph">[colour]</span><br>'
  'C. Brand <span class="ph">[brand]</span></td>',
  '<td>A. Style <span class="ph">[style]</span><br>B. Colour ' +
  (SEL % ('occ', 'Shingle colour')) + '<br>C. Brand <span class="ph">[brand]</span></td>')

# ── 5. stamp + changelog ───────────────────────────────────────────────────
olds = ("v2026-08-12 build 749 &#8212; The roofing agreement now carries the numbered house diagram from the "
        "printed contract")
news = ("v2026-08-12 build 750 &#8212; Shingle colour and drip edge colour are dropdowns on the roofing "
        "agreement instead of blank boxes")
assert src.count(olds) == 1, 'app stamp anchor'
src = src.replace(olds, news)

oldc = "var CHANGELOG = [\n{ b:749,"
newc = ("var CHANGELOG = [\n"
        "{ b:750, d:'2026-08-12', t:'Colour dropdowns on the roofing agreement',\n"
        "s:'Three colour boxes on the roofing agreement are dropdowns now instead of blank lines you type "
        "into. Shingle colour lists the real Owens Corning colours \\u2014 the same ones behind the Colors "
        "screen, in the same order, and a discontinued colour still shows up but says so. Drip edge colour "
        "and gutter apron colour list the standard aluminium trim colours, with Other on the end so nobody "
        "is stuck. What you pick is saved with the contract and is still there when you open it again, and "
        "an old contract keeps the colours it was written with rather than quietly changing if the "
        "catalogue moves on.' },\n"
        "{ b:749,")
assert src.count(oldc) == 1, 'changelog anchor'
src = src.replace(oldc, newc)

assert src != orig
pl.write_atomic(SRC, src)
print('PATCH OK')

# ── self-checks ────────────────────────────────────────────────────────────
def tpl_of(source, name):
    d = re.search(r'(?:var|const)\s+%s\s*=\s*`' % name, source)
    return source[d.end():source.index('`;', d.end())]

assert src.count('data-crsel="occ"') == 1, 'one shingle-colour dropdown'
assert src.count('data-crsel="trim"') == 2, 'drip edge + gutter apron'
assert src.count('function wireColorSelects(doc)') == 1
assert src.count('wireColorSelects(doc);') == 1, 'called exactly once'
assert src.count('var TRIM_COLORS = ') == 1
# 4 sites, not 3: the guard reads it, the wire sets it, and serializeFrame both
# SELECTS on it and removes it. Counting the concept instead of the string got
# this wrong first time -- the app was correct.
assert src.count('data-crsel-wired') == 4, 'guard + set + select + strip'

# oc_colors must still have exactly ONE reader in the whole app
assert src.count("from('oc_colors')") == orig.count("from('oc_colors')") == 1, \
    'a second pipeline onto oc_colors was opened'
print('oc_colors still has exactly one reader')

roof = tpl_of(src, 'ROOF_AGREEMENT_BODY')
assert roof.count('<select') == 3 and roof.count('</select>') == 3
assert 'contenteditable="false"' in roof
# ⚠️ ONE [colour] SURVIVES ON PURPOSE: item 5, Valley metal. Theo named three
# fields -- shingle colour, drip edge, gutter apron -- and valley metal is a
# fourth. It is the SAME trim palette and arguably should match, but widening a
# signed-contract change beyond what was asked is not mine to decide, so it stays
# free text and gets raised with him instead. If he says yes it is one more line.
assert roof.count('[colour]') == 1, 'only valley metal should still be free text'
assert '5. Valley metal' in roof and re.search(r'5\. Valley metal.*?\[colour\]', roof, re.S), \
    'the surviving placeholder must be the valley-metal one'
assert '[style]' in roof and '[brand]' in roof, 'style and brand stay free text'
assert '`' not in roof and '${' not in roof
print('roofing agreement: 3 selects, style/brand untouched')

# nothing leaked into the other agreements
for n in ['SIDING_AGREEMENT_BODY', 'GUTTER_AGREEMENT_BODY']:
    assert tpl_of(src, n) == tpl_of(orig, n), n + ' changed'
print('siding + gutter agreements byte-identical')

# 748 and 749 intact
for n, want in [('ROOF_AGREEMENT_BODY', 23), ('SIDING_AGREEMENT_BODY', 21), ('GUTTER_AGREEMENT_BODY', 32)]:
    assert tpl_of(src, n).count('class="cbx"') == want, n + ' checkbox count moved'
assert src.count('class="roofdiag"') == 1 and '[circle' not in src
print('748 tick boxes + 749 diagram intact')

base = tpl_of(src, 'ESTIMATE_BASE_RAW')
assert '`' not in base and '${' not in base, 'BUG_CLASSES 38'
# TWO rules, not one: the screen rule and its @media print override. Both are
# this build's; file-wide is also 2, so nothing else defines the class.
assert base.count('.crsel{') == 2, 'screen rule + print override'
assert src.count('.crsel{') == 2, 'the class is defined nowhere else'
for tok in ['build 750 &#8212;', '{ b:750,']:
    assert tok in src, 'missing ' + tok
print('ALL SELF-CHECKS PASS')
