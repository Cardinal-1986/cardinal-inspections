#!/usr/bin/env python3
"""Build 1211 - the estimate builder's phone header stops carrying two controls
the thumb bar already has.

Audit item 4. OPEN_ITEMS recorded it as "drop Save Draft and Publish from the
header at <=760px - one CSS rule". MEASURING IT FIRST changed the build twice,
and both corrections are the point of this file.

  1. THE BREAKPOINT IN THAT NOTE WAS WRONG AND WOULD HAVE SHIPPED A HOLE.
     `.cr-est-phonebar` appears at `@media (max-width:700px)`; 760px is 1205's
     WRAP breakpoint, a different rule solving a different problem. Hiding the
     header pair at <=760 would have left 701-760px with no Save and no Publish
     ANYWHERE - the header's hidden, the thumb bar hasn't appeared yet. The rule
     below is pinned to the phone bar's own 700px, so the two always trade
     places rather than both being absent.

  2. IT DOES NOT MAKE THE HEADER SHORTER, AND I SAID IT WOULD.
     `audit_estheader.mjs` measures the real screen: at 390px the header is
     150px in three rows - the h2, then Close/Preview/Options, then
     `-> Contract`/Publish/Save Draft. Hiding Save and Publish leaves
     `-> Contract` alone on the third row, so the measured height is 150px
     before and 150px after. Every candidate set was measured; only removing a
     THIRD control (Options, 86px) gets the row down, and that one has no
     duplicate anywhere. So this build is a DECLUTTER of a cramped row, not the
     height fix the note promised - said plainly rather than quietly reframed.

HIDDEN, NEVER REMOVED - and that is load-bearing, not tidiness. `cr-epub`'s
injectButton() returns early unless `head.querySelector('[data-act="save"]')`
finds something, and `cr-e2c` anchors on `#cr-epub-btn` or that same Save
button. querySelector finds a display:none element; it does not find a deleted
one. Deleting either would silently strip Preview, Options, Publish AND
-> Contract from the header. The probe asserts all three anchors survive.

THE SECOND EDIT IS THE COST OF THE FIRST. handlePublishClick() writes
"Publishing..." onto #cr-epub-btn - the button this build hides on a phone - so
without it the thumb bar's Publish would tap and appear to do nothing on a
money screen. save() already solved this exact problem for Save, writing to
BOTH [data-act="save"] and [data-act="bar-save"]; pubSet() is that same
pattern applied to Publish. One mechanism per concept, which is the rule here.

Usage: patch_1211.py --src in.html --dst out.html
"""
import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

# ---------------------------------------------------------------- 1. the CSS
# EXTEND the phone bar's OWN media block rather than opening a second one at
# the same width. There are already five live `@media (max-width:700px)` blocks
# in this file -- six textual hits, one of which is prose in a comment (a naive
# "assert there are none" caught that for me) -- and the
# one thing this rule must never do is drift away from the bar it hands the
# work to -- so it goes inside that bar's block, five characters from it.
CSS_OLD = (
"#cr-est-view .cr-est-body{padding-bottom:88px}"
"body:has(#cr-est-view.open) #cr-dark-toggle{bottom:96px}}"
)
CSS_NEW = (
"#cr-est-view .cr-est-body{padding-bottom:88px}"
"body:has(#cr-est-view.open) #cr-dark-toggle{bottom:96px}"
"/* 1211: the header stops carrying the two controls this bar already has.\n"
"   Measured with audit_estheader.mjs before and after -- the header is 150px\n"
"   at 390px EITHER WAY, because `\u2192 Contract` still holds the third row on its\n"
"   own. A less crowded row, not a shorter one; the row only comes back if a\n"
"   third control goes, and none of the remaining three is duplicated anywhere.\n"
"   \u26a0 IN THIS BLOCK ON PURPOSE. OPEN_ITEMS proposed <=760px, which is 1205's\n"
"   WRAP breakpoint -- a different rule solving a different problem. At\n"
"   701\u2013760px the bar has not appeared yet, so hiding these there would leave\n"
"   no Save and no Publish anywhere on the screen. Living inside the bar's own\n"
"   media query is what stops the two ever drifting apart again.\n"
"   \u26a0 HIDDEN, NEVER REMOVED. cr-epub's injectButton() bails unless\n"
"   head.querySelector('[data-act=\"save\"]') finds something, and cr-e2c anchors\n"
"   on #cr-epub-btn or that same button. querySelector finds a display:none\n"
"   node; it does not find a deleted one. Delete either and the header silently\n"
"   loses Preview, Options, Publish AND \u2192 Contract. */\n"
"#cr-est-view .cr-est-head [data-act=\"save\"],"
"#cr-est-view .cr-est-head #cr-epub-btn{display:none}}"
)

# ------------------------------------------------- 2. publish progress, mirrored
HELPER_ANCHOR = "async function handlePublishClick(){\n"
HELPER_NEW = (
"/* 1211: the header's Publish is hidden at <=700px, so ITS 'Publishing…'\n"
"   label is invisible exactly where the thumb bar is the only way to press it.\n"
"   save() already writes its own progress to the header button AND the bar's\n"
"   copy of it; this is that same pattern, not a second mechanism, and it\n"
"   deliberately drives the real button too so the two can never disagree.\n"
"   \u26a0 The selector names are deliberately NOT spelled out in this comment.\n"
"   Build 732 lost a round to a patch whose own prose contained the literal its\n"
"   self-check asserted on, and planting a string here would make every future\n"
"   grep for that control report a hit that is not code. */\n"
"function pubSet(busy){\n"
"[document.getElementById('cr-epub-btn'),\n"
" document.querySelector('#cr-est-view [data-act=\"bar-publish\"]')]\n"
".forEach(function(b){\n"
"if(!b) return;\n"
"b.disabled = busy;\n"
"b.textContent = busy ? 'Publishing\\u2026' : 'Publish';\n"
"});\n"
"}\n"
"async function handlePublishClick(){\n"
)

# inside handlePublishClick ONLY -- `btn.disabled = false; btn.textContent = 'Publish';`
# appears twice in it, so a file-wide sub() is meaningless here (and a file-wide
# assert of 1 would fail correct code). Slice, patch the slice, re-join.
BUSY_ON  = "btn.disabled = true; btn.textContent = 'Publishing\\u2026';"
BUSY_OFF = "btn.disabled = false; btn.textContent = 'Publish';"
FINALLY_OLD = (
"var b = document.getElementById('cr-epub-btn');\n"
"if(b){ b.disabled = false; b.textContent = 'Publish'; }"
)

STAMP_OLD = ">v2026-09-10 build 1210<button"
STAMP_NEW = ">v2026-09-10 build 1211<button"

CL_OLD = "var CHANGELOG = [\n"
CL_NEW = (
"var CHANGELOG = [\n"
"  { b: 1211, d: '2026-09-10', t: 'The estimate screen stops showing you Save and Publish twice on a phone', "
"s: 'Opening an estimate on a phone put <b>Save Draft</b> and <b>Publish</b> in two places at once \\u2014 in the "
"dark bar under your thumb, where they have been since build 1029, and again up in the cramped header. The header "
"copies are gone on a phone now; the thumb bar is the one place to press. Everything else in that header stays "
"exactly where it was, and on a tablet or a desktop nothing changes at all. Publish also shows you it is working "
"now: the button under your thumb reads <b>Publishing\\u2026</b> while it runs, which the header copy used to do "
"where you could not see it. Worth saying plainly \\u2014 the header is still the same height. Two fewer buttons "
"came out of a row that another button was holding open anyway, so this is a tidier row rather than a shorter one.' },\n"
)


def slice_fn(src, header):
    """Brace-match one function out of the file. Print what was captured before
    asserting on it -- an extractor that swallowed the wrong span returns
    counts that look like a legitimate zero."""
    i = src.index(header)
    j = src.index('{', i)
    depth, k = 0, j
    while True:
        c = src[k]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                break
        k += 1
    return i, k + 1, src[i:k + 1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--dst', required=True)
    a = ap.parse_args()

    src = pl.load(a.src)
    orig = src

    # ---- 1. the CSS rule -------------------------------------------------
    # 6 textual hits, and only FIVE are blocks -- the sixth (in the #brandTitle
    # note near the top) is PROSE inside a comment quoting the rule it deleted.
    # This file's own counting trap, reproduced while writing the assertion.
    n700 = src.count('@media (max-width:700px)')
    assert n700 == 6, 'expected 6 hits (5 blocks + 1 in prose), found %d -- read them first' % n700
    src = pl.sub(src, CSS_OLD, CSS_NEW)

    # ---- 2. the helper, then the five sites INSIDE handlePublishClick ----
    src = pl.sub(src, HELPER_ANCHOR, HELPER_NEW)
    assert src.count('function pubSet(busy){') == 1

    s0, s1, fn = slice_fn(src, 'async function handlePublishClick(){')
    print('  handlePublishClick captured: %d chars, %d lines' % (len(fn), fn.count('\n') + 1))
    assert 400 < len(fn) < 3000, 'the slice is the wrong size -- check the brace match'
    assert fn.count(BUSY_ON) == 1, 'busy-on site count is %d' % fn.count(BUSY_ON)
    assert fn.count(BUSY_OFF) == 2, 'busy-off site count is %d, expected 2' % fn.count(BUSY_OFF)
    assert fn.count(FINALLY_OLD) == 1

    fn2 = fn.replace(BUSY_ON, 'pubSet(true);')
    fn2 = fn2.replace(BUSY_OFF, 'pubSet(false);')
    fn2 = fn2.replace(FINALLY_OLD, 'pubSet(false);')
    assert fn2.count('pubSet(true);') == 1 and fn2.count('pubSet(false);') == 3
    # the guard that keeps the function honest when the button is gone stays
    assert "var btn = document.getElementById('cr-epub-btn');\nif(!btn) return;" in fn2
    src = src[:s0] + fn2 + src[s1:]

    # ---- 3. stamp + changelog -------------------------------------------
    src = pl.sub(src, STAMP_OLD, STAMP_NEW)
    src = pl.sub(src, CL_OLD, CL_NEW)

    # ---- self-computing assertions --------------------------------------
    assert orig.count('build 1210') - src.count('build 1210') == 1
    assert src.count('{ b: 1211,') == 1
    assert src.count('{ b: 1210,') == orig.count('{ b: 1210,') == 1

    # the phone bar and its two buttons are untouched -- this build must not
    # move the surface it is handing the work to
    # the bar's Publish gains exactly ONE new reader -- pubSet's querySelector.
    # Asserting "unchanged" here would have been asserting the fix did nothing.
    assert src.count('data-act="bar-publish"') == orig.count('data-act="bar-publish"') + 1, \
        'pubSet should add exactly one reference to the bar\'s Publish'
    for frag in ("data-act=\"bar-save\"",
                 "#cr-est-view .cr-est-phonebar{display:flex",
                 "#cr-est-view .cr-est-body{padding-bottom:88px}",
                 "@media (max-width:760px){\n  .cr-est-head{flex-wrap:wrap;}"):
        assert orig.count(frag) == src.count(frag), 'unrelated code moved: ' + frag

    # the anchors the two injectors need are still in the SOURCE (the render
    # writes them); hiding is a stylesheet act, and nothing here removes them
    # ⚠ SCOPED, not file-wide. That button markup appears FOUR times in this
    #   file -- four modules each have their own Save -- so a file-wide count of
    #   1 fails correct code. Anchor on the estimate builder's own render line,
    #   which is unique because of the Save/Save Draft ternary beside it.
    EST_SAVE = ("'<button class=\"primary\" data-act=\"save\" type=\"button\">'"
                " + (s.id ? 'Save' : 'Save Draft') + '</button>' +")
    assert src.count(EST_SAVE) == orig.count(EST_SAVE) == 1, \
        'the builder stopped rendering its Save button -- the injectors anchor on it'
    assert src.count("btn.id = 'cr-epub-btn';") == orig.count("btn.id = 'cr-epub-btn';") == 1

    # NO new media block -- the rule joined the phone bar's own one
    assert src.count('@media (max-width:700px)') == n700, 'a media block was added, not extended'
    assert src.count('@media (max-width:760px)') == orig.count('@media (max-width:760px)')

    pl.write_atomic(a.dst, src)
    pl.assert_in(a.dst, '>v2026-09-10 build 1211<button')
    pl.assert_in(a.dst, '#cr-est-view .cr-est-head #cr-epub-btn{display:none}')
    print('index.html +%d chars (one 700px rule, pubSet mirror, stamp, changelog)'
          % (len(src) - len(orig)))


if __name__ == '__main__':
    main()
