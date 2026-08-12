# -*- coding: utf-8 -*-
"""Build 749 — the roofing Construction Agreement gets the numbered house diagram.

   Theo: "Can you do the house diagram with numbers"

   ⚠️ IT IS NOT DRAWN — IT IS THE MASTER'S OWN ILLUSTRATION, RECOVERED FROM THE PDF.
   His complaint at 748 was that the on-screen contract "looks nothing like the actual
   contract". Substituting a hand-drawn SVG would have repeated that mistake in a new
   way. `docs/Cardinal_Roofing_Contract.pdf` page 1 carries the cutaway as an embedded
   PNG (xref 30, 1172x840, placed at 218x156pt); it was extracted with PyMuPDF, made
   greyscale, resized to 760px and re-encoded as JPEG q84 — 96,877 bytes, 129,195 as a
   data URI. **Verified by eye at print size before shipping**: all eleven callouts stay
   legible, which is the only thing that matters on a halftone this small.

   WHY 760px AND NOT LARGER. The master prints it 3.03in wide. Here it is capped at
   3.6in, so 760px is ~211 dpi — ample for a halftone illustration. THE COST IS PER
   DOCUMENT, NOT PER FILE: `serializeFrame()` stores each contract's whole HTML, so the
   blob is paid on every saved agreement. Measured the established precedent first —
   the Cardinal logo is ALREADY a 139,982-char data URI in every document built by
   `buildEstimate` — so this addition is deliberately kept smaller than the logo already
   sitting beside it. A 900px version (152 KB) and a 1040px one (186 KB) were both
   rejected on that basis.

   THE NUMBERS ARE BAKED INTO THE IMAGE, exactly as on the master, and they line up 1:1
   with the numbered rows of the spec table it sits above:
     1 decking · 2 roof deck protection · 3 drip edge/gutter apron · 4 ice & water
     barrier (three places) · 5 valley metal · 6 starter shingles · 7 shingles ·
     8 flashing · 9 extrusions · 10 ventilation · 11 ridge cap/hip cap
   (12 existing layers and 13 roof pitch are counts, not places, so the master gives
   them no callout either.)

   ⚠️ ROOFING ONLY, AND THAT IS MEASURED, NOT ASSUMED. The siding and gutter masters
   were opened too: `Cardinal_Siding_Contract.pdf` and `Cardinal_Gutter_Contract.pdf`
   carry only the Cardinal logo and the BBB badge — neither has a diagram. So there is
   nothing to port to the other two agreements.

   ⚠️ THE FIGURE MUST NOT LOOK LIKE A PHOTO SLOT. `wireCoverPhoto()` claims
   `.cover-photo` and `wirePhotoFrames()` claims `.fig .frame`; both inject a file input
   and turn the box into an upload target. Swept every doc-side `querySelectorAll` that
   touches an `img` — `.fig .frame img`, `img[data-lb-img]`, `img[data-shot]`,
   `img[src*="/object/public/photos/"]` — and all four are scoped. `.roofdiag` collides
   with none of them, so the diagram is a picture, not a drop zone. It is also outside
   `EDITABLE_SELECTOR`, so it cannot be typed over or deleted by accident.
"""
import sys, re
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

SRC = '/home/user/cardinal-inspections/index.html'
SCR = '/tmp/claude-0/-home-user-cardinal-inspections/f3a6e9a6-4280-517c-92b7-d56b9e8a504e/scratchpad/'
src = pl.load(SRC)
orig = src

DIAG = open(SCR + 'roofdiag_datauri.txt').read().strip()
assert DIAG.startswith('data:image/jpeg;base64,')
assert '`' not in DIAG and '${' not in DIAG and '"' not in DIAG, 'the data URI would break the template literal'
assert re.fullmatch(r'data:image/jpeg;base64,[A-Za-z0-9+/=]+', DIAG), 'unexpected characters in the data URI'
print('diagram data URI: %d chars' % len(DIAG))

def in_tpl(source, name, old, new):
    d = re.search(r'(?:var|const)\s+%s\s*=\s*`' % name, source)
    assert d, 'no template ' + name
    st = d.end(); en = source.index('`;', st)
    blk = source[st:en]
    assert blk.count(old) == 1, '%s: expected 1 of %r, found %d' % (name, old[:70], blk.count(old))
    return source[:st] + blk.replace(old, new) + source[en:]

# ── 1. the figure's CSS, beside the .cbx rule 748 reused ──────────────────────
old = ".cbx{cursor:pointer;font-size:13pt;user-select:none;}"
new = """.cbx{cursor:pointer;font-size:13pt;user-select:none;}
/* 749: the numbered house cutaway, lifted from the printed master. A figure element
   carries a 40px UA side margin, so it is zeroed explicitly rather than inherited.
   The callouts only make sense beside their numbered rows, so the block never
   splits across a page.
   NOTE: this comment lives INSIDE a template literal, so it must contain no
   backtick and no dollar-brace. The first draft of this build quoted the word
   figure in backticks right here; that would have closed ESTIMATE_BASE_RAW in the
   middle of its own stylesheet and turned the rest into JavaScript. The assertion
   at the end of the patch script caught it -- twice, because the correction quoted
   it again. */
.roofdiag{margin:8px auto 14px;text-align:center;break-inside:avoid;page-break-inside:avoid;}
.roofdiag img{display:block;margin:0 auto;width:100%;max-width:3.6in;height:auto;
  border:1px solid var(--line);border-radius:3px;}
.roofdiag figcaption{font-size:8.5pt;color:var(--muted);margin:4px 0 0;}"""
assert '`' not in new and '${' not in new, \
    'the CSS being inserted contains a backtick or ${ -- it would close the template literal'
src = in_tpl(src, 'ESTIMATE_BASE_RAW', old, new)

# ── 2. the figure itself, above the numbered spec table ──────────────────────
old = """<h2 class="sec">Project Specifications</h2>
<p class="items-hint no-print">Tap a box to check it &#8212; it prints checked.</p>
<table class="meta">"""
new = ("""<h2 class="sec">Project Specifications</h2>
<p class="items-hint no-print">Tap a box to check it &#8212; it prints checked.</p>
<figure class="roofdiag">
<img src=\"""" + DIAG + """\" alt="Cutaway of a roof with numbered callouts matching the specification items below: 1 decking, 2 roof deck protection, 3 drip edge and gutter apron, 4 ice and water barrier, 5 valley metal, 6 starter shingles, 7 shingles, 8 flashing, 9 extrusions, 10 ventilation, 11 ridge cap and hip cap.">
<figcaption>The numbers on the house match the numbered items below.</figcaption>
</figure>
<table class="meta">""")
src = in_tpl(src, 'ROOF_AGREEMENT_BODY', old, new)

# ── 3. app stamp + changelog ─────────────────────────────────────────────────
olds = ("v2026-08-12 build 748 &#8212; The three Construction Agreements have real tick boxes now instead of "
        "telling you to circle something you cannot circle")
news = ("v2026-08-12 build 749 &#8212; The roofing agreement now carries the numbered house diagram from the "
        "printed contract")
assert src.count(olds) == 1, 'app stamp anchor'
src = src.replace(olds, news)

oldc = "var CHANGELOG = [\n{ b:748,"
newc = ("var CHANGELOG = [\n"
        "{ b:749, d:'2026-08-12', t:'The house diagram, off the real contract',\n"
        "s:'The roofing Construction Agreement now shows the numbered house cutaway, sitting right above the "
        "specification list so the numbers on the picture line up with the numbered rows underneath \\u2014 1 "
        "decking, 2 roof deck protection, 3 drip edge, 4 ice and water barrier, and so on up to 11 ridge cap. "
        "It is not a drawing: it is the same illustration off the printed Construction Agreement, taken out of "
        "the PDF itself, so the contract on the iPad and the one in the truck show the same picture. It prints "
        "with the document and never splits across two pages. Only the roofing agreement gets it \\u2014 the "
        "siding and gutter masters do not have a diagram to take.' },\n"
        "{ b:748,")
assert src.count(oldc) == 1, 'changelog anchor'
src = src.replace(oldc, newc)

assert src != orig
pl.write_atomic(SRC, src)
print('PATCH OK  (+%d chars)' % (len(src) - len(orig)))

# ── self-checks ──────────────────────────────────────────────────────────────
def tpl_of(source, name):
    d = re.search(r'(?:var|const)\s+%s\s*=\s*`' % name, source)
    return source[d.end():source.index('`;', d.end())]

assert src.count(DIAG) == 1, 'the diagram must be embedded exactly once'
assert src.count('class="roofdiag"') == 1
assert src.count('.roofdiag{') == 1, 'the css belongs to ESTIMATE_BASE_RAW only'

roof = tpl_of(src, 'ROOF_AGREEMENT_BODY')
assert roof.count('<figure class="roofdiag">') == 1
assert roof.count('</figure>') == 1
assert '`' not in roof and '${' not in roof, 'template literal broken'
# it must sit ABOVE the numbered table, or the callouts refer forward to nothing
assert roof.index('roofdiag') < roof.index('1. Decking'), 'the diagram must precede the spec rows'
print('figure lands above the spec rows, once, in the roofing agreement only')

# the OTHER two agreements must be untouched
for n in ['SIDING_AGREEMENT_BODY', 'GUTTER_AGREEMENT_BODY']:
    assert 'roofdiag' not in tpl_of(src, n), n + ' should not have a diagram'
    assert tpl_of(src, n) == tpl_of(orig, n), n + ' changed'
print('siding + gutter agreements byte-identical')

# 748's checkboxes must all survive
for n, want in [('ROOF_AGREEMENT_BODY', 23), ('SIDING_AGREEMENT_BODY', 21), ('GUTTER_AGREEMENT_BODY', 32)]:
    got = tpl_of(src, n).count('class="cbx"')
    assert got == want, '%s checkbox count %d != %d' % (n, got, want)
assert '[circle' not in src, '748 must still hold'
print("748's 76 tick boxes all survive")

# the figure must not be mistakable for a photo slot
assert 'cover-photo' not in roof and 'class="fig"' not in roof
for sel in ['.fig .frame', '.cover-photo']:
    assert src.count(sel) == orig.count(sel), 'photo wiring selector count moved: ' + sel
print('no collision with the photo-upload wiring')

base = tpl_of(src, 'ESTIMATE_BASE_RAW')
assert base.count('.cbx{cursor:pointer') == 1
# THIS ASSERTION EARNED ITS KEEP: the first run of 749 put a backtick-quoted word in
# the CSS comment above, inside a template literal. It would have closed the literal
# 5,000 characters early and turned the rest of the stylesheet into JavaScript.
assert '`' not in base, 'a backtick got into ESTIMATE_BASE_RAW -- it would close the literal'
assert '${' not in base, 'a ${ got into ESTIMATE_BASE_RAW -- it would interpolate'
for tok in ['build 749 &#8212;', '{ b:749,']:
    assert tok in src, 'missing ' + tok
print('ALL SELF-CHECKS PASS')
