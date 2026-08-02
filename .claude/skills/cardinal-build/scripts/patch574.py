#!/usr/bin/env python3
"""Build 574 — the Showcase.

Direct surgery on index.html. Every edit is exact-match with an asserted
occurrence count; a failed assert aborts before any write.

Edits, in order:
  1  hideAllViews  — register #cr-show in the 572 class-shown array
  2  navRestore    — a 'showcase' restore case
  3  Sales Floor   — the entry button in the markup
  4  Sales Floor   — the data-go branch that opens it
  5  572 CSS       — add #cr-show to the shared desktop inset / z-60 rule
  6  572 CSS       — add the .cr-sh-wrap desktop width
  7  append        — <style id=cr-show-styles> + <script id=cr-show-script>
  8  app stamp     — 573 -> 574
  9  CHANGELOG     — the 574 entry
"""
import sys, os, re

SKILL = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts'
sys.path.insert(0, SKILL)
import patch_lib as pl

SRC = '/home/user/cardinal-inspections/index.html'
MOD = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cr_show_module.html')

src = pl.load(SRC)
orig = src
print('loaded %d chars' % len(src))

# ── 1 · hideAllViews: register the overlay ────────────────────────────────
OLD1 = """  [{ id:'cr-sf', api:window.CardinalSalesFloor },
   { id:'cr-pb', api:window.CardinalProduction }].forEach(function(o){"""
NEW1 = """  /* 574: the Showcase is the same shape — created at runtime, shown by a class,
     with its own close() that also dismisses the add-pair form. */
  [{ id:'cr-sf', api:window.CardinalSalesFloor },
   { id:'cr-pb', api:window.CardinalProduction },
   { id:'cr-show', api:window.CardinalShowcase }].forEach(function(o){"""
src = pl.sub(src, OLD1, NEW1)
print('1 ok — hideAllViews')

# ── 2 · navRestore case ───────────────────────────────────────────────────
OLD2 = """        case 'production':      if(window.CardinalProduction) window.CardinalProduction.open(); break;"""
NEW2 = """        case 'production':      if(window.CardinalProduction) window.CardinalProduction.open(); break;
        case 'showcase':        if(window.CardinalShowcase) window.CardinalShowcase.open(); break;"""
src = pl.sub(src, OLD2, NEW2)
print('2 ok — navRestore')

# ── 3 · Sales Floor entry button ──────────────────────────────────────────
OLD3 = """'<button data-go="log" type="button"><span class="i">\\uD83D\\uDCDD</span>' +
'<span class="x"><b>Log a real one</b><small>Something you heard today</small></span></button>' +"""
NEW3 = """'<button data-go="log" type="button"><span class="i">\\uD83D\\uDCDD</span>' +
'<span class="x"><b>Log a real one</b><small>Something you heard today</small></span></button>' +
'<button data-go="showcase" type="button"><span class="i">\\uD83C\\uDFE0</span>' +
'<span class="x"><b>Showcase</b><small>Before and after, for the kitchen table</small></span></button>' +"""
src = pl.sub(src, OLD3, NEW3)
print('3 ok — Sales Floor button')

# ── 4 · Sales Floor data-go branch ────────────────────────────────────────
OLD4 = """if(d === 'library' && typeof window.showResourceLibrary === 'function'){
close(false); window.showResourceLibrary(); return;
}
alert('That isn\\u2019t available yet.');"""
NEW4 = """if(d === 'library' && typeof window.showResourceLibrary === 'function'){
close(false); window.showResourceLibrary(); return;
}
if(d === 'showcase' && window.CardinalShowcase){
close(false); window.CardinalShowcase.open(); return;
}
alert('That isn\\u2019t available yet.');"""
src = pl.sub(src, OLD4, NEW4)
print('4 ok — Sales Floor handler')

# ── 5 · the shared 572 desktop-inset rule ─────────────────────────────────
# Extending the existing rule rather than writing a new one, so all five
# overlays keep moving together.
OLD5 = """body.cr-lnav-on #cr-sf,
body.cr-lnav-on #cr-pb,
body.cr-lnav-on #cr-coach-mount,
body.cr-lnav-on #cr-adjusters-mount{"""
NEW5 = """body.cr-lnav-on #cr-sf,
body.cr-lnav-on #cr-pb,
body.cr-lnav-on #cr-show,
body.cr-lnav-on #cr-coach-mount,
body.cr-lnav-on #cr-adjusters-mount{"""
src = pl.sub(src, OLD5, NEW5)
print('5 ok — desktop inset')

# ── 6 · desktop measure, beside its neighbours ────────────────────────────
OLD6 = """body.cr-lnav-on .cr-sf-wrap{ max-width:940px !important; }"""
NEW6 = """body.cr-lnav-on .cr-sf-wrap{ max-width:940px !important; }
/* 574: the Showcase is pictures, not prose — it earns the board's width. */
body.cr-lnav-on .cr-sh-wrap{ max-width:1180px !important; }"""
src = pl.sub(src, OLD6, NEW6)
print('6 ok — desktop width')

# ── 7 · append the module ─────────────────────────────────────────────────
# </body> appears 11 times: contract templates and generated documents carry
# their own, and three are prose inside install-instruction comments. rfind()
# still lands on the real document close.
module = pl.load(MOD).rstrip('\n')
i = src.rfind('</body>')
assert i != -1, 'no </body> found'
print('   appending at %d (of %d </body> occurrences)' % (i, src.count('</body>')))
src = src[:i] + module + '\n\n' + src[i:]
print('7 ok — module appended (%d chars)' % len(module))

# ── 8 · app stamp ─────────────────────────────────────────────────────────
OLD8 = 'v2026-08-02 build 573 &#8212; the Objections Coach, Pricing, Company Documents and Adjusters follow dark mode'
NEW8 = 'v2026-08-02 build 574 &#8212; the Showcase: before and after, side by side, for the kitchen table'
src = pl.sub(src, OLD8, NEW8)
print('8 ok — app stamp 573 -> 574')

# ── 9 · CHANGELOG ─────────────────────────────────────────────────────────
m = re.search(r"(var CHANGELOG\s*=\s*\[\s*\n)", src)
assert m, 'CHANGELOG array not found'
entry = (
    "{ b:574, d:'2026-08-02', t:'The Showcase', "
    "s:'Before and after, side by side, on the Sales Floor. Drag the divider and the finished "
    "roof wipes over the old one. Privacy mode swaps the address for a project number so the "
    "tablet can go across the table. Theo adds the pairs from his phone; everyone else can show them.' },\n"
)
src = src[:m.end(1)] + entry + src[m.end(1):]
print('9 ok — CHANGELOG entry')

# ── prove scope ───────────────────────────────────────────────────────────
assert src != orig
assert src.count('id="cr-show-script"') == 1, 'module script block not unique'
assert src.count('id="cr-show-styles"') == 1, 'module style block not unique'
assert src.count('build 574') >= 1
assert src.count('build 573') == orig.count('build 573') - 1, 'stamp not swapped exactly once'
print('grew %d -> %d chars (+%d)' % (len(orig), len(src), len(src) - len(orig)))

pl.write_atomic(SRC, src)
print('written')
pl.assert_in(SRC, 'id="cr-show-script"')
pl.assert_in(SRC, 'window.CardinalShowcase = Object.assign')
pl.assert_in(SRC, "case 'showcase':")
print('artifact verified')
