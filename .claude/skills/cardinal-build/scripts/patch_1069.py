#!/usr/bin/env python3
"""Build 1069 — the inspection report stops asking for what the app knows.

Theo, 26 Aug, after previews: "1A, drawer dark like the toolbar."
Three changes he picked, in one build because they land on one screen.

1 · THE REPORT NOW TRACKS THE CHECKLIST INSTEAD OF SNAPSHOTTING IT
  prefillChecklist() has always existed and fills nine Property Facts from the
  Roofing Inspection Checklist -- but it ran ONLY at creation, as a string
  transform on the template, and baked the result in. Complete the checklist
  afterwards, or edit it, and the report never learned: the placeholders sat
  there reading "[Age - from checklist]" while the checklist had the age.
  That is most of what "51 to fill" was.

  resyncChecklist() is the same nine fields applied to the LIVE document every
  time the editor opens. It fills BLANKS ONLY -- an element whose text is still
  a bracketed placeholder -- so it can never overwrite something Theo typed.
  That is the property that makes it safe to run unasked.

  ⚠ ONE LIST, TWO CONSUMERS. CK_FIELDS is the single source of truth; the
  creation-time string pass and the open-time DOM pass both read it. A second
  copy of that mapping is a bug with a delay on it (CLAUDE.md: one pipeline per
  concept), and this is exactly the shape that would drift.

2 · THE TOOLBAR: 1A, WITH A DARK DRAWER
  Eleven buttons in a `grid-template-columns:1fr 1fr` at <=760px is six rows,
  ~440px of an 844px phone before the document starts. Now: Save, Print/PDF and
  the fill chip stay, the other eight move behind "More".

  ⚠ DESKTOP IS DELIBERATELY UNTOUCHED. The secondary buttons are wrapped in
  #edSecondary, which is `display:contents` -- so above 760px the wrapper
  vanishes from layout and all eleven lay out exactly as they did. Only the
  phone breakpoint hides the wrapper and shows More.

  ⚠ THE DRAWER RENDERS THE REAL BUTTONS, IT DOES NOT RE-IMPLEMENT THEM. Each
  row delegates to `b.click()` on the actual toolbar button, and rows are built
  at open time from the buttons that are currently VISIBLE -- so a control JS
  has hidden (sigBtn when a report cannot be signed, rccBtn for a non-admin)
  never appears. Duplicating those handlers would be a second pipeline.

  ⚠ NO FOURTEENTH SCROLL-LOCK WRITER. The drawer follows #navMenu's idiom
  exactly -- a class toggle, a document-level click closer, stopPropagation on
  the opener -- and writes document.body.style.overflow ZERO times. CLAUDE.md:
  13 modules write that property, there is no reconciler, and the no-14th-writer
  rule has held for 234 builds. It still holds.

3 · SHORT PLACEHOLDER LABELS
  "[e.g. Single-family residence with masonry chimney, covered front porch,
  detached garage]" is a developer's note wearing a highlighter. It becomes
  "[Structure]" and the example moves to the title attribute.

  ⚠ THE SQUARE BRACKETS ARE LOAD-BEARING AND MUST STAY. fillBlanks() decides a
  field is empty with /^\\[[^\\]]*\\]$/ and compactForPrint() strips unfilled
  placeholders from print with charAt(0)==='['. A bare word would silently
  break the "N to fill" counter AND put a naked hint on a client's PDF. Only
  the CONTENTS shrink.

  ⚠ TWO TEMPLATES CARRY THIS TABLE, not one: REPORT_TEMPLATE (roof) and
  EXTERIOR_TEMPLATE (the 596-598 exterior vocabulary). Every placeholder edit
  here is count==2. Patching one and not the other would have left the exterior
  report on the old text and, worse, out of sync with CK_FIELDS.

  ⚠ AND CK_FIELDS CARRIES THE LEGACY SPELLING. Every report already saved in
  the database holds the long placeholders. `was` is how those keep working --
  drop it and re-sync silently stops for every existing document.
"""
import sys
sys.path.insert(0, '.claude/skills/cardinal-build/scripts')
import patch_lib as pl

SRC = 'index.html'
src = pl.load(SRC)
orig = src

# ── 1 · CK_FIELDS + a rewritten prefillChecklist + resyncChecklist ────────
OLD_FN = """/* checklist values -> inspection report Property Facts */
function prefillChecklist(tpl, cl){
  if(!cl) return tpl;
  function put(placeholder, value){
    if(!value) return;
    tpl = tpl.split('<span class="ph">' + placeholder + '</span>')
             .join('<span class="fill">' + esc(value) + '</span>');
  }
  put('[e.g. Single-family residence with masonry chimney, covered front porch, detached garage]', cl.structure);
  put('[e.g. Asphalt shingles \\u2014 field, hip, and ridge]', cl.rooftype);
  put('[e.g. 1\\u00d78 nominal plank (board) decking, gapped]', cl.decking);
  put('[e.g. Accessible \\u2014 decking, framing, insulation observed]',
      cl.attic === 'Yes'
        ? 'Accessible \\u2014 attic, decking and ventilation inspected from interior'
        : 'No attic access at time of inspection \\u2014 decking assessed from exterior only');
  put('[e.g. Visual, non-invasive; roof surface accessed directly]', cl.method);
  put('[Age \\u2014 from checklist]', cl.age + ' years (estimated)');
  put('[Layers \\u2014 from checklist]', cl.layers);
  put('[Pitch \\u2014 from checklist]', cl.pitch);
  put('[Condition \\u2014 from checklist]', cl.condition);"""

NEW_FN = """/* 1069: the report-side view of the checklist's nine required fields.

   \u26a0 NAMED CK_REPORT_MAP, NOT CK_FIELDS. `CK_FIELDS` is already taken --
   it is the checklist's OWN list of required field names, read by
   openChecklist() to populate the form and by ckSave() to validate it. A
   second `var CK_FIELDS` in the same scope would have silently broken
   checklist saving. Caught by a count assertion, not by reading.

   KEYED BY THE CHECKLIST FIELD NAME on purpose, so the relationship between
   the two lists is visible in the source instead of being a coincidence that
   two orderings happen to agree. The patch asserts every key here exists in
   CK_FIELDS.
   Two consumers read it and there must never be a third copy:
     - prefillChecklist(tpl, cl)  - a string pass, at creation
     - resyncChecklist(doc, cl)   - a DOM pass, every time the editor opens
   `ph`  is what the template says today (short, since 1069)
   `was` is the long spelling every report saved before 1069 still carries.
         Drop it and re-sync silently stops working for existing documents. */
var CK_REPORT_MAP = {
  structure:{ ph:'[Structure]', was:'[e.g. Single-family residence with masonry chimney, covered front porch, detached garage]',
    get:function(cl){ return cl.structure; } },
  rooftype:{ ph:'[Roof covering]', was:'[e.g. Asphalt shingles \\u2014 field, hip, and ridge]',
    get:function(cl){ return cl.rooftype; } },
  decking:{ ph:'[Decking]', was:'[e.g. 1\\u00d78 nominal plank (board) decking, gapped]',
    get:function(cl){ return cl.decking; } },
  attic:{ ph:'[Attic access]', was:'[e.g. Accessible \\u2014 decking, framing, insulation observed]',
    get:function(cl){ return cl.attic === 'Yes'
        ? 'Accessible \\u2014 attic, decking and ventilation inspected from interior'
        : 'No attic access at time of inspection \\u2014 decking assessed from exterior only'; } },
  method:{ ph:'[Method]', was:'[e.g. Visual, non-invasive; roof surface accessed directly]',
    get:function(cl){ return cl.method; } },
  age:{ ph:'[Age]', was:'[Age \\u2014 from checklist]',
    get:function(cl){ return cl.age ? (cl.age + ' years (estimated)') : ''; } },
  layers:{ ph:'[Layers]', was:'[Layers \\u2014 from checklist]', get:function(cl){ return cl.layers; } },
  pitch:{ ph:'[Pitch]', was:'[Pitch \\u2014 from checklist]', get:function(cl){ return cl.pitch; } },
  condition:{ ph:'[Condition]', was:'[Condition \\u2014 from checklist]', get:function(cl){ return cl.condition; } }
};

/* 1069: the LIVE document, every time the editor opens.
   ⚠ FILLS BLANKS ONLY. A .ph whose text is no longer a bracketed placeholder
   has been answered by a person, and a person outranks the checklist. That is
   the property that makes it safe to run without asking. Returns how many it
   filled, so the toolbar can say so rather than changing the document in
   silence (build 808's lesson: a correct state with no explanation is its own
   defect). */
function resyncChecklist(doc, cl){
  if(!doc || !cl) return 0;
  var n = 0;
  var keys = Object.keys(CK_REPORT_MAP);
  Array.prototype.forEach.call(doc.querySelectorAll('.ph'), function(el){
    var t = (el.textContent || '').trim();
    if(!/^\\[[^\\]]*\\]$/.test(t)) return;          /* already answered */
    for(var i = 0; i < keys.length; i++){
      var f = CK_REPORT_MAP[keys[i]];
      if(t !== f.ph && t !== f.was) continue;
      var v = '';
      try{ v = f.get(cl) || ''; }catch(_e){ v = ''; }
      if(!v) return;
      el.className = 'fill';
      el.removeAttribute('title');
      el.textContent = v;
      n++;
      return;
    }
  });
  return n;
}

/* checklist values -> inspection report Property Facts */
function prefillChecklist(tpl, cl){
  if(!cl) return tpl;
  function put(placeholder, value){
    if(!value) return;
    tpl = tpl.split('<span class="ph">' + placeholder + '</span>')
             .join('<span class="fill">' + esc(value) + '</span>');
  }
  Object.keys(CK_REPORT_MAP).forEach(function(k){
    var f = CK_REPORT_MAP[k];
    var v = '';
    try{ v = f.get(cl) || ''; }catch(_e){ v = ''; }
    if(!v) return;
    put(f.ph, v);
    put(f.was, v);   /* a template that predates 1069 still fills */
  });"""
src = pl.sub(src, OLD_FN, NEW_FN)

# ── 2 · re-sync on every open, and SAY so ────────────────────────────────
src = pl.sub(src,
    """      var doc = frame.contentDocument;
      lockTemplate(doc);""",
    """      var doc = frame.contentDocument;
      lockTemplate(doc);
      /* 1069: pull the checklist through EVERY time, not just at creation.
         Blanks only, so a value Theo typed is never touched. Announced in the
         flash rather than applied silently. */
      try{
        var _ck = (typeof getChecklist === 'function' && window.currentProject)
                    ? getChecklist(window.currentProject) : null;
        if(_ck){
          var _n = resyncChecklist(doc, _ck);
          if(_n && savedFlash) savedFlash.textContent =
            _n + (_n === 1 ? ' field' : ' fields') + ' pulled from the checklist';
          if(_n && typeof refreshFillChip === 'function') refreshFillChip();
        }
      }catch(_rs){}""")

# ── 3 · the toolbar: three primaries, the rest behind a dark drawer ───────
# 3a. fillChipBtn moves up beside Print so the phone grid reads Save|Print,
#     Fill|More; the remaining eight are wrapped so ONE rule hides them.
src = pl.sub(src,
    """<button class="btn dark" id="dlBtn" data-cri="save"><span class="bl">Download</span></button>""",
    """<button class="btn dark" id="fillChipBtn" style="display:none;"><span class="bl" id="fillChipTxt">&#8212;</span></button>
      <button class="btn dark" id="edMoreBtn" aria-haspopup="true" aria-expanded="false"><span class="bl">&#8943; More</span></button>
      <span id="edSecondary"><button class="btn dark" id="dlBtn" data-cri="save"><span class="bl">Download</span></button>""")
# Remove the original fillChipBtn from its old slot -- it moved up beside
# Print. Anchored WITHOUT a trailing quote character: a `"` immediately
# before a closing triple-quote is ambiguous to the parser, and that cost a
# run. Built by concatenation instead, which cannot be misread.
_OLD_FILL = ('<button class="btn dark" id="fillChipBtn" style="display:none;">'
             '<span class="bl" id="fillChipTxt">&#8212;</span></button>\n'
             '      <button class="btn dark" id="shareBtn')
src = pl.sub(src, _OLD_FILL, '<button class="btn dark" id="shareBtn')

# 3b. close the wrapper after the last secondary button, and add the drawer
ANCH = src[src.find('id="sortBtn"'):]
ANCH = ANCH[:ANCH.find('</button>') + len('</button>')]
src = pl.sub(src, ANCH, ANCH + """</span>
      <div id="edDrawer" role="menu" aria-hidden="true"></div>""")

# 3c. the CSS — dark, matching the toolbar, 44px rows
src = pl.sub(src,
    """.edbtns{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}""",
    """.edbtns{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
/* 1069 \u2014 the toolbar drawer (Theo's pick 1A, dark like the toolbar).
   #edSecondary is display:contents so that ABOVE the phone breakpoint the
   wrapper is not in the layout at all and all eleven buttons sit exactly where
   they always did. Desktop is deliberately unchanged. */
#edSecondary{display:contents;}
#edMoreBtn{display:none;}
#edDrawer{
  position:fixed;left:10px;right:10px;bottom:10px;z-index:400;
  background:var(--ink,#1b1b1b);
  border:1px solid rgba(255,255,255,.16);border-radius:12px;
  box-shadow:0 12px 34px rgba(0,0,0,.55);
  overflow:hidden auto;max-height:70vh;display:none;
}
#edDrawer.open{display:block;}
#edDrawer .edrow{
  display:block;width:100%;text-align:left;border:0;cursor:pointer;
  background:transparent;color:#ffffff;
  padding:14px 16px;min-height:44px;
  border-bottom:1px solid rgba(255,255,255,.10);
  font:700 14px 'Segoe UI',Arial,sans-serif;
}
#edDrawer .edrow:last-child{border-bottom:0;}
#edDrawer .edrow:active{background:rgba(255,255,255,.10);}""")

src = pl.sub(src,
    """@media (max-width:760px){
  .toolbar .edbtns{order:2;flex:1 1 100%;width:100%;display:grid""",
    """@media (max-width:760px){
  /* 1069: the phone shows three primaries plus More; the other eight are one
     tap away in #edDrawer. Hiding the WRAPPER rather than each button means no
     !important is needed to beat the per-button style.display that JS sets. */
  .toolbar #edSecondary{display:none;}
  .toolbar #edMoreBtn{display:inline-block;}
  .toolbar .edbtns{order:2;flex:1 1 100%;width:100%;display:grid""")

# ── 3d. the drawer's behaviour — #navMenu's idiom, ZERO scroll-lock writes ─
src = pl.sub(src,
    """var assistSend = document.getElementById('assistSend');""",
    """/* 1069: the toolbar drawer. Deliberately modelled on #navMenu: a class
   toggle, a document-level click closer, stopPropagation on the opener, and
   NO write to document.body.style.overflow. CLAUDE.md counts 13 modules that
   write the global scroll lock with no reconciler, and the no-14th-writer
   rule has held for 234 builds; a menu does not need to lock scroll to work.
   The rows are a VIEW of the real buttons -- each delegates to b.click(), and
   they are rebuilt on every open from the buttons that are currently VISIBLE,
   so a control JS has hidden (sigBtn on an unsignable report, rccBtn for a
   non-admin) never shows up here. Re-implementing those handlers would be a
   second pipeline for one concept. */
(function(){
  var moreBtn = document.getElementById('edMoreBtn');
  var drawer  = document.getElementById('edDrawer');
  if(!moreBtn || !drawer) return;
  function shut(){
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    moreBtn.setAttribute('aria-expanded', 'false');
  }
  function build(){
    drawer.innerHTML = '';
    var sec = document.getElementById('edSecondary');
    if(!sec) return 0;
    var n = 0;
    Array.prototype.forEach.call(sec.querySelectorAll('button'), function(b){
      if(b.style.display === 'none') return;   /* JS hid it: it does not apply */
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'edrow';
      row.textContent = (b.textContent || '').trim();
      row.addEventListener('click', function(e){ e.stopPropagation(); shut(); b.click(); });
      drawer.appendChild(row);
      n++;
    });
    return n;
  }
  moreBtn.addEventListener('click', function(e){
    e.stopPropagation();
    if(drawer.classList.contains('open')){ shut(); return; }
    if(!build()) return;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    moreBtn.setAttribute('aria-expanded', 'true');
  });
  document.addEventListener('click', shut);
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') shut(); });
})();

var assistSend = document.getElementById('assistSend');""")

# ── 4 · short labels, in BOTH templates, brackets KEPT ────────────────────
SHORT = [
  ('[e.g. Single-family residence with masonry chimney, covered front porch, detached garage]',
   '[Structure]'),
  ('[e.g. Asphalt shingles — field, hip, and ridge]',            '[Roof covering]'),
  ('[e.g. Gable roof with front dormer and porch roof]',              '[Roof style]'),
  ('[e.g. 1×8 nominal plank (board) decking, gapped]',           '[Decking]'),
  ('[Age — from checklist]',                                     '[Age]'),
  ('[Layers — from checklist]',                                  '[Layers]'),
  ('[Pitch — from checklist]',                                   '[Pitch]'),
  ('[Condition — from checklist]',                               '[Condition]'),
  ('[e.g. Accessible — decking, framing, insulation observed]',  '[Attic access]'),
  ('[e.g. Visual, non-invasive; roof surface accessed directly]',     '[Method]'),
]
for long_txt, short in SHORT:
    hint = long_txt[1:-1]
    if hint.startswith('e.g. '): hint = hint[5:]
    if hint.endswith(' — from checklist'): hint = 'from the inspection checklist'
    old = '<span class="ph">' + long_txt + '</span>'
    new = '<span class="ph" title="' + hint.replace('"', '&quot;') + '">' + short + '</span>'
    # ⚠ count=2: REPORT_TEMPLATE (roof) and EXTERIOR_TEMPLATE (596-598) both
    # carry this table. Patching one would leave the other on the old text AND
    # out of step with CK_FIELDS.
    src = pl.sub(src, old, new, count=2)

# ── 5 · the app stamp ────────────────────────────────────────────────────
src = pl.sub(src, 'v2026-08-25 build 1068', 'v2026-08-26 build 1069')

# ── 6 · CHANGELOG ────────────────────────────────────────────────────────
src = pl.sub(src, "var CHANGELOG = [\n", """var CHANGELOG = [
  { b:1069, d:'2026-08-26', t:'The inspection report fills itself in and stops hiding behind buttons',
  s:'Three things at once on the report editor. The report now pulls the roof checklist through every time you open it, not just the moment you create it \\u2014 so finishing the checklist afterwards, or changing it, finally reaches the report, and it tells you how many fields it filled. It only ever fills blanks, so anything you typed is left alone. The toolbar\\u2019s eleven buttons are now three plus a More drawer, which gives the document back about half the phone screen. And the long bracketed examples like \\u201C[e.g. 1\\u00d78 nominal plank (board) decking, gapped]\\u201D are short labels now, with the example kept as a tooltip.' },""")

# ── proof of scope ───────────────────────────────────────────────────────
assert src.count('v2026-08-26 build 1069') == 1
assert src.count('v2026-08-25 build 1068') == 0
assert src.count('b:1069') == 1
assert src.count('var CK_REPORT_MAP = {') == 1
# \u26a0 the pre-existing CK_FIELDS must survive untouched -- it is the
# checklist's own required-field list and ckSave() validates against it
assert src.count('var CK_FIELDS = [') == 1, 'the checklist\'s own CK_FIELDS must remain'
assert "var CK_FIELDS = ['structure','method','attic','age','condition','layers','decking','pitch','rooftype']" in src
# every key of the report map must BE a checklist field
import re as _re2
_ckf = _re2.search(r"var CK_FIELDS = \[([^\]]*)\]", src).group(1)
_ckf = set(_re2.findall(r"'([a-z_]+)'", _ckf))
_map = src[src.find('var CK_REPORT_MAP = {'):]
_map = _map[:_map.find('\n};')]
for _k in _re2.findall(r"\n  ([a-z_]+):\{", _map):
    assert _k in _ckf, 'report map key ' + _k + ' is not a checklist field'
assert src.count('function resyncChecklist(doc, cl)') == 1
assert src.count('id="edMoreBtn"') == 1
assert src.count('id="edSecondary"') == 1
assert src.count('id="edDrawer"') == 1
assert src.count('id="fillChipBtn"') == 1, 'the fill chip must exist exactly once after the move'
assert src.count('#edSecondary{display:contents;}') == 1
# the drawer must not become a 14th scroll-lock writer
_drawer = src[src.find("var moreBtn = document.getElementById('edMoreBtn')"):]
_drawer = _drawer[:_drawer.find('var assistSend')]
assert 'style.overflow' not in _drawer, 'the drawer must not write the global scroll lock'
# every long placeholder is gone from BOTH templates, and every short one is in
for long_txt, short in SHORT:
    assert src.count('<span class="ph">' + long_txt + '</span>') == 0, long_txt
    assert src.count('>' + short + '</span>') == 2, short
# CK_FIELDS still knows the legacy spelling for reports saved before 1069
for legacy in ['[Age \\u2014 from checklist]', '[Layers \\u2014 from checklist]']:
    assert src.count("was:'" + legacy + "'") == 1, legacy
# the brackets that fillBlanks() and compactForPrint() depend on survive
import re as _re
for _l, _s in SHORT:
    assert _re.match(r'^\[[^\]]*\]$', _s), _s

pl.write_atomic(SRC, src)
pl.assert_in(SRC, 'function resyncChecklist(doc, cl)')
print('build 1069 written')
print(f'  {len(orig):,} -> {len(src):,} chars (+{len(src)-len(orig)})')
