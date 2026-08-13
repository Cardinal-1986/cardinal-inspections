# -*- coding: utf-8 -*-
"""Build 748 — the three Construction Agreements get real checkboxes.

   Theo: "Also when doing a new contract. It doesn't make sense. It says to
   circle but only does text edits and looks nothing like the actual contract
   with check boxes."

   He is right, and the fix costs NO new mechanism. THE PRIME DOCTRINE AGAIN:
   clickable checkboxes already exist and already ship.

     * `.cbx{cursor:pointer;font-size:13pt;user-select:none;}` is already in
       ESTIMATE_BASE_RAW — the very skeleton all three Agreements are built from.
     * `wireCheckboxes(doc)` already exists and is ALREADY CALLED from the report
       editor's onload, once, for every document it opens.
     * Two documents already use it in production: GUTTER_BODY's size boxes
       (data-val) and ANDERSEN_BODY's series boxes (data-group).

   So the Agreements were the only priced documents that never got the treatment.
   This build adds ZERO javascript and ZERO css. It converts markup only, and the
   existing handler picks the boxes up for free.

   THE THREE BEHAVIOURS, all already implemented in wireCheckboxes():
     data-group="x"  -> radio. Ticking one clears every other box in group x.
     no attribute    -> independent toggle. This is "[circle all that apply]".
     data-val        -> the gutter-size boxes. NOT USED HERE (it also rewrites
                        the gutter description via applyGutterSize).

   ⚠️ `.opts` SPANS ARE LEFT ALONE ON PURPOSE — decking, layers, pitch. They are
   not a "circle one" prompt; they are the COLLAPSE mechanism. `collapse(key,val)`
   swaps the whole span for a filled value using
       <span class="opts" data-opts="KEY">[^<]*(?:<(?!/span>)[^<]*)*</span>
   and that regex stops at the first `</span>`. Putting a checkbox inside one
   would truncate the match and break the auto-fill from the roof inspection.

   ⚠️ THE ANCHORS REPEAT ACROSS THE THREE BODIES. "Primary residence", "HOA
   approval required", "Selected" and the Specifications heading are byte-identical
   in all three Agreements, so a file-wide replace would hit three times and a
   file-wide count==1 assertion would abort a correct patch. Every edit below is
   scoped to ONE template literal by name.

   ⚠️ NOTHING READS THE LITERAL "[circle" — swept, zero code references. The
   prompts are plain `.ph` placeholder text, so removing them breaks no
   substitution. Saved contracts keep their own stored HTML and are untouched.

   The lettering (A. / B. / C.) is preserved exactly, because the printed master
   Theo hands people is lettered and the two must read the same.
"""
import sys, re
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

SRC = '/home/user/cardinal-inspections/index.html'
src = pl.load(SRC)
orig = src

BOX = '<span class="cbx"%s>&#9744;</span>'          # &#9744; == U+2610 BALLOT BOX
def b(grp=None):
    return BOX % ('' if grp is None else ' data-group="%s"' % grp)

EDITS = []          # (template, old, new) applied in order, scoped per template

def E(tpl, old, new):
    EDITS.append((tpl, old, new))

def in_tpl(source, name, old, new):
    d = re.search(r'(?:var|const)\s+%s\s*=\s*`' % name, source)
    assert d, 'no template ' + name
    st = d.end(); en = source.index('`;', st)
    blk = source[st:en]
    assert blk.count(old) == 1, '%s: expected 1 of %r, found %d' % (name, old[:70], blk.count(old))
    return source[:st] + blk.replace(old, new) + source[en:]

HINT = ('<h2 class="sec">Project Specifications</h2>\n'
        '<p class="items-hint no-print">Tap a box to check it &#8212; it prints checked.</p>')
SPEC = '<h2 class="sec">Project Specifications</h2>'

# ══ shared rows — identical text in all three Agreements, patched per template ══
PRIM_OLD = ('<tr><td class="k">Primary residence</td><td><b>Yes</b> &nbsp;/&nbsp; <b>No</b>'
            ' &nbsp; <span class="ph">[circle one]</span></td></tr>')
HOA_OLD = ('<p style="font-size:10.5pt;">HOA approval required: <b>Yes</b> &nbsp;/&nbsp;'
           ' <b>No</b> &nbsp; <span class="ph">[circle one]</span><br>')
SEL_OLD = '<tr><td class="k">Selected</td><td><span class="ph">[circle one]</span></td></tr>'

def sel_new(grp, opts):
    cells = ' &nbsp;&nbsp; '.join(b(grp) + ' ' + o for o in opts)
    return '<tr><td class="k">Selected</td><td>' + cells + '</td></tr>'

for t, p in [('ROOF_AGREEMENT_BODY', 'r'), ('SIDING_AGREEMENT_BODY', 's'), ('GUTTER_AGREEMENT_BODY', 'g')]:
    E(t, SPEC, HINT)
    E(t, PRIM_OLD,
      '<tr><td class="k">Primary residence</td><td>' + b(p + 'prim') + ' <b>Yes</b>'
      ' &nbsp;&nbsp; ' + b(p + 'prim') + ' <b>No</b></td></tr>')
    E(t, HOA_OLD,
      '<p style="font-size:10.5pt;">HOA approval required: ' + b(p + 'hoa') + ' <b>Yes</b>'
      ' &nbsp;&nbsp; ' + b(p + 'hoa') + ' <b>No</b><br>')

E('ROOF_AGREEMENT_BODY',   SEL_OLD, sel_new('rwar', ['Standard', 'Systems Protection', 'Preferred Protection']))
E('SIDING_AGREEMENT_BODY', SEL_OLD, sel_new('swar', ['Standard', 'Other']))
E('GUTTER_AGREEMENT_BODY', SEL_OLD, sel_new('gwar', ['Standard', 'Upgraded']))

# ══ ROOFING ═══════════════════════════════════════════════════════════════════
E('ROOF_AGREEMENT_BODY',
  '<td>A. Felt underlayment 15&nbsp;lb &nbsp; B. Felt underlayment 30&nbsp;lb &nbsp;'
  ' C. Synthetic underlayment &nbsp; <span class="ph">[circle one]</span></td>',
  '<td>' + b('rdp') + ' A. Felt underlayment 15&nbsp;lb &nbsp; ' + b('rdp') +
  ' B. Felt underlayment 30&nbsp;lb &nbsp; ' + b('rdp') + ' C. Synthetic underlayment</td>')

E('ROOF_AGREEMENT_BODY',
  '<td>Install along eaves, valleys &amp; flashings &#8212; A. Standard &nbsp; B. OC'
  ' &nbsp; <span class="ph">[circle one]</span></td>',
  '<td>Install along eaves, valleys &amp; flashings &#8212; ' + b('riw') +
  ' A. Standard &nbsp; ' + b('riw') + ' B. OC</td>')

E('ROOF_AGREEMENT_BODY',
  '<td>Install along all rakes &amp; eaves &#8212; A. Standard &nbsp; B. OC Starter Plus'
  ' &nbsp; <span class="ph">[circle one]</span></td>',
  '<td>Install along all rakes &amp; eaves &#8212; ' + b('rst') +
  ' A. Standard &nbsp; ' + b('rst') + ' B. OC Starter Plus</td>')

# "circle all that apply" -> ungrouped, independent toggles. Both rows.
E('ROOF_AGREEMENT_BODY',
  '<td>A. Chimney &nbsp; B. Wall &nbsp; C. Step &nbsp; <span class="ph">[circle all that apply]</span>'
  '<br>Extra structure: A. Garage &nbsp; B. Shed &nbsp; C. Barn &nbsp; <span class="ph">[if any]</span></td>',
  '<td>' + b() + ' A. Chimney &nbsp; ' + b() + ' B. Wall &nbsp; ' + b() + ' C. Step'
  '<br>Extra structure: ' + b() + ' A. Garage &nbsp; ' + b() + ' B. Shed &nbsp; ' + b() + ' C. Barn</td>')

# A. Standard, or B. OC with a sub-choice — three mutually exclusive boxes,
# lettered exactly as the paper master is.
E('ROOF_AGREEMENT_BODY',
  '<td>A. Standard &nbsp; B. OC &#8212; 1. Pro Edge &nbsp; 2. Decoridge &nbsp;'
  ' <span class="ph">[circle one]</span></td>',
  '<td>' + b('rrc') + ' A. Standard &nbsp;&nbsp; B. OC &#8212; ' + b('rrc') +
  ' 1. Pro Edge &nbsp; ' + b('rrc') + ' 2. Decoridge</td>')

# ══ SIDING ════════════════════════════════════════════════════════════════════
E('SIDING_AGREEMENT_BODY',
  '<td>A. Vinyl &nbsp; B. Wood &nbsp; C. Aluminum / steel &nbsp; D. Fiber cement / other'
  ' &nbsp; <span class="ph">[circle one]</span></td>',
  '<td>' + b('sex') + ' A. Vinyl &nbsp; ' + b('sex') + ' B. Wood &nbsp; ' + b('sex') +
  ' C. Aluminum / steel &nbsp; ' + b('sex') + ' D. Fiber cement / other</td>')

E('SIDING_AGREEMENT_BODY',
  '<td>A. Standard house wrap &nbsp; B. Premium house wrap &nbsp; C. Fanfold insulation board'
  ' &nbsp; <span class="ph">[circle one]</span></td>',
  '<td>' + b('swrap') + ' A. Standard house wrap &nbsp; ' + b('swrap') +
  ' B. Premium house wrap &nbsp; ' + b('swrap') + ' C. Fanfold insulation board</td>')

E('SIDING_AGREEMENT_BODY',
  '<td>A. Vented &nbsp; B. Solid &nbsp; <span class="ph">[circle one]</span>'
  ' &nbsp;&#183;&nbsp; C. Colour <span class="ph">[colour]</span></td>',
  '<td>' + b('ssof') + ' A. Vented &nbsp; ' + b('ssof') + ' B. Solid'
  ' &nbsp;&#183;&nbsp; C. Colour <span class="ph">[colour]</span></td>')

E('SIDING_AGREEMENT_BODY',
  '<td>A. Remove &amp; reinstall existing &nbsp; B. New shutters &#8212; colour'
  ' <span class="ph">[colour]</span> &nbsp; <span class="ph">[circle one]</span></td>',
  '<td>' + b('sshut') + ' A. Remove &amp; reinstall existing &nbsp; ' + b('sshut') +
  ' B. New shutters &#8212; colour <span class="ph">[colour]</span></td>')

E('SIDING_AGREEMENT_BODY',
  '<td>1 &nbsp; 1.5 &nbsp; 2 &nbsp; 2+ &nbsp; <span class="ph">[circle one]</span></td>',
  '<td>' + b('sst') + ' 1 &nbsp; ' + b('sst') + ' 1.5 &nbsp; ' + b('sst') + ' 2 &nbsp; ' +
  b('sst') + ' 2+</td>')

# ══ GUTTERS ═══════════════════════════════════════════════════════════════════
# two independent choices on one row: profile, then size
E('GUTTER_AGREEMENT_BODY',
  '<td>A. K-style &nbsp; B. Half-round &nbsp; C. Box &nbsp; <span class="ph">[circle one]</span>'
  '<br>5&nbsp;in. &nbsp; 6&nbsp;in. &nbsp; 7&nbsp;in. &nbsp; <span class="ph">[circle one]</span></td>',
  '<td>' + b('gprof') + ' A. K-style &nbsp; ' + b('gprof') + ' B. Half-round &nbsp; ' +
  b('gprof') + ' C. Box<br>' + b('gsize') + ' 5&nbsp;in. &nbsp; ' + b('gsize') +
  ' 6&nbsp;in. &nbsp; ' + b('gsize') + ' 7&nbsp;in.</td>')

E('GUTTER_AGREEMENT_BODY',
  '<td>A. Strip miters &nbsp; B. Box miters &nbsp; C. Hand-mitered &nbsp; D. Sealed &nbsp;'
  ' <span class="ph">[circle all that apply]</span></td>',
  '<td>' + b() + ' A. Strip miters &nbsp; ' + b() + ' B. Box miters &nbsp; ' + b() +
  ' C. Hand-mitered &nbsp; ' + b() + ' D. Sealed</td>')

E('GUTTER_AGREEMENT_BODY',
  '<td>A. 2&#215;3 &nbsp; B. 3&#215;4 &nbsp; C. Round &nbsp; <span class="ph">[circle one]</span>'
  '<br>Colour <span class="ph">[colour]</span> &nbsp;&#183;&nbsp; Qty <span class="ph">[qty]</span></td>',
  '<td>' + b('gds') + ' A. 2&#215;3 &nbsp; ' + b('gds') + ' B. 3&#215;4 &nbsp; ' + b('gds') +
  ' C. Round<br>Colour <span class="ph">[colour]</span> &nbsp;&#183;&nbsp; Qty <span class="ph">[qty]</span></td>')

E('GUTTER_AGREEMENT_BODY',
  '<td>A. Splash blocks &nbsp; B. Extensions &nbsp; C. Tie to existing &nbsp;'
  ' <span class="ph">[circle one]</span><br>Notes <span class="ph">[notes]</span></td>',
  '<td>' + b('gdis') + ' A. Splash blocks &nbsp; ' + b('gdis') + ' B. Extensions &nbsp; ' +
  b('gdis') + ' C. Tie to existing<br>Notes <span class="ph">[notes]</span></td>')

# Gutter protection: the panel choice, the finish and the size are three separate
# choices. "No gutter protection on this job" joins the PANEL group, so picking it
# clears A/B/C — which is what it means. It was already drawn as a box (&#9633;,
# WHITE SQUARE) but carried no class, so it had never been clickable.
E('GUTTER_AGREEMENT_BODY',
  '<td>A. ShurFlo Flat &nbsp; B. ShurFlo X (ventilation) &nbsp; C. ShurFlo Step-Down (Quick-Screw hangers)'
  '<br>Finish: mill &nbsp; black &nbsp; white &nbsp; copper &nbsp;&#183;&nbsp; 5&nbsp;in. &nbsp; 6&nbsp;in.'
  ' &nbsp; <span class="ph">[circle one]</span>',
  '<td>' + b('ggp') + ' A. ShurFlo Flat &nbsp; ' + b('ggp') + ' B. ShurFlo X (ventilation) &nbsp; ' +
  b('ggp') + ' C. ShurFlo Step-Down (Quick-Screw hangers)'
  '<br>Finish: ' + b('ggpf') + ' mill &nbsp; ' + b('ggpf') + ' black &nbsp; ' + b('ggpf') +
  ' white &nbsp; ' + b('ggpf') + ' copper &nbsp;&#183;&nbsp; ' + b('ggps') + ' 5&nbsp;in. &nbsp; ' +
  b('ggps') + ' 6&nbsp;in.')

E('GUTTER_AGREEMENT_BODY',
  '<br>&#9633; No gutter protection on this job</td>',
  '<br>' + b('ggp') + ' No gutter protection on this job</td>')

# ── apply, sequentially, each scoped to its own template ──────────────────────
for tpl, old, new in EDITS:
    src = in_tpl(src, tpl, old, new)

# ── app stamp + changelog ─────────────────────────────────────────────────────
olds = ("v2026-08-12 build 747 &#8212; Printed contracts drop the property photo, every page carries a slim "
        "header, and the page breaks fall where they should")
news = ("v2026-08-12 build 748 &#8212; The three Construction Agreements have real tick boxes now instead of "
        "telling you to circle something you cannot circle")
assert src.count(olds) == 1, 'app stamp anchor'
src = src.replace(olds, news)

oldc = "var CHANGELOG = [\n{ b:748,"
assert oldc not in src
oldc = "var CHANGELOG = [\n{ b:747,"
newc = ("var CHANGELOG = [\n"
        "{ b:748, d:'2026-08-12', t:'Contracts have tick boxes instead of \\u201ccircle one\\u201d',\n"
        "s:'You said a new contract told you to circle things you could not circle, and looked nothing like "
        "the real one. Every one of those prompts is now an actual tick box you tap \\u2014 25 of them across "
        "the Roofing, Siding and Gutter agreements. Where the paper says pick one, ticking a box clears the "
        "others in that row automatically. Where it says all that apply \\u2014 flashing locations, gutter "
        "miters \\u2014 each box toggles on its own. The lettering is unchanged, so the screen and the printed "
        "master read the same, and a ticked box prints as ticked. On the gutter agreement, the \\u201cNo gutter "
        "protection on this job\\u201d line was already drawn as a box but had never been clickable; it is now, "
        "and ticking it clears the ShurFlo choices. Nothing else about any agreement changed.' },\n"
        "{ b:747,")
assert src.count(oldc) == 1, 'changelog anchor'
src = src.replace(oldc, newc)

assert src != orig
pl.write_atomic(SRC, src)
print('PATCH OK — %d scoped edits' % len(EDITS))

# ── self-checks ───────────────────────────────────────────────────────────────
def tpl_of(source, name):
    d = re.search(r'(?:var|const)\s+%s\s*=\s*`' % name, source)
    return source[d.end():source.index('`;', d.end())]

# 1. every circle prompt is gone from the three Agreements — and ONLY from there
before_all = len(re.findall(r'\[circle', orig, re.I))
after_all = len(re.findall(r'\[circle', src, re.I))
print('[circle prompts: %d -> %d' % (before_all, after_all))
assert before_all == 25 and after_all == 0, 'expected all 25 to go'

# self-computing: exactly the boxes we added, no more
added = src.count('class="cbx"') - orig.count('class="cbx"')
print('class="cbx" %d -> %d  (+%d)' % (orig.count('class="cbx"'), src.count('class="cbx"'), added))

tot = 0
for name, pfx in [('ROOF_AGREEMENT_BODY', 'r'), ('SIDING_AGREEMENT_BODY', 's'), ('GUTTER_AGREEMENT_BODY', 'g')]:
    blk = tpl_of(src, name)
    n = blk.count('class="cbx"')
    grouped = len(re.findall(r'class="cbx" data-group=', blk))
    free = n - grouped
    groups = sorted(set(re.findall(r'data-group="([^"]+)"', blk)))
    tot += n
    assert '[circle' not in blk, name + ' still has a circle prompt'
    assert '`' not in blk and '${' not in blk, name + ': template literal broken'
    assert blk.count('items-hint no-print') == 1, name + ': one hint'
    # every group must have >= 2 members, or it is a radio with nothing to clear
    for g in groups:
        c = len(re.findall(r'data-group="%s"' % g, blk))
        assert c >= 2, '%s: group %s has only %d box(es)' % (name, g, c)
    print('  %-22s %2d boxes  (%d grouped / %d free)  groups: %s'
          % (name, n, grouped, free, ','.join(groups)))
assert tot == added, 'boxes landed outside the three Agreements (%d vs %d)' % (tot, added)

# 2. the .opts collapse mechanism must be untouched — no checkbox inside one,
#    and the collapse regex must still match all five spans.
assert src.count('data-opts=') == orig.count('data-opts=') == 5
for key in ['layers', 'pitch', 'decking']:
    rx = re.compile('<span class="opts" data-opts="' + key + '">[^<]*(?:<(?!/span>)[^<]*)*</span>')
    assert rx.search(src), 'collapse() would no longer match ' + key
print('collapse() still matches layers / pitch / decking')

# 3. NO new javascript and NO new css — this build is markup only
for fn in ['function wireCheckboxes(doc){', 'function applyGutterSize(doc, val){',
           '.cbx{cursor:pointer;font-size:13pt;user-select:none;}']:
    assert src.count(fn) == orig.count(fn) == 1, 'mechanism changed: ' + fn
assert src.count('wireCheckboxes(doc);') == orig.count('wireCheckboxes(doc);') == 1
print('mechanism untouched: wireCheckboxes / applyGutterSize / .cbx css all unchanged')

# 4. data-val is NOT used here — it would fire applyGutterSize and rewrite text
for name in ['ROOF_AGREEMENT_BODY', 'SIDING_AGREEMENT_BODY', 'GUTTER_AGREEMENT_BODY']:
    assert 'data-val' not in tpl_of(src, name), name + ' must not use data-val'
print('no data-val in any Agreement (that flag rewrites the gutter description)')

# 5. the glyph must be the one the handler compares against
assert src.count('&#9744;') == added, 'every new box must carry &#9744;'
assert '&#9633; No gutter protection' not in src, 'the dead square should be a real box now'
for tok in ['build 748 &#8212;', '{ b:748,']:
    assert tok in src, 'missing ' + tok
print('ALL SELF-CHECKS PASS')
