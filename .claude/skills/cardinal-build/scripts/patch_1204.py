#!/usr/bin/env python3
"""Build 1204 — the document editor stops hiding the send, and says where the way out goes.

Audit option 13 (A12, CR_SALES_WORKFLOW_AUDIT_2026-09). Walk 6 landed a rep in the
document editor after Publish and found:

  * the phone toolbar read `Mark sent · Save · Print / PDF · ⋯ More`, so the most
    prominent control on a document nobody has sent was the one that sends nothing;
  * the three ways to actually deliver it — Email to client · Text to sign · Share
    link — were two taps deep inside the ⋯ More drawer;
  * there was no labelled Close or Back. The walk looked for one for 30 s. The only
    exits were the client-name chip (title="Back to client overview") and the logo
    (title="Save & go home") — and a phone never shows a title attribute.

Three changes, no new control and no second pipeline:

  1. The three sends are MOVED out of #edSecondary into the primary row, ahead of
     ⋯ More. Moved, not copied: the drawer builds its rows from #edSecondary's
     visible buttons, so a copy would have shown each send twice.
  2. On the phone the status row is ordered AFTER the button grid, so "Mark sent"
     reads as the manual override it is rather than the headline.
  3. The client chip says "‹ Back" beside the name. It keeps the name because that
     is also how a rep knows whose document is open.

Usage: patch_1204.py --src in.html --dst out.html
"""
import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

# ---------------------------------------------------------------- 1. markup
# Remove the three sends from the secondary set FIRST; inserting them up front
# first would make every one of these anchors match twice and abort the run.
DROP_MAIL = (
    '<button class="btn dark" id="emailDocBtn" data-cri="mail">'
    '<span class="bl">Email to client</span></button>\n'
    '      <button class="btn dark" id="textSignBtn" data-cri="chat" '
    'title="Text the client a link to review and sign">'
    '<span class="bl">Text to sign</span></button>\n      '
)
DROP_SHARE = (
    '<button class="btn dark" id="shareBtn" data-cri="paperclip">'
    '<span class="bl">Share link</span></button>\n      '
)

MORE_OLD = '      <button class="btn dark" id="edMoreBtn" aria-haspopup="true"'
MORE_NEW = (
    '      <!-- 1204: the three real sends are PRIMARY. A12 of the Sep 2026 walk:\n'
    '           after Publish the prominent button was "Mark sent", which sends\n'
    '           nothing, while Email / Text / Share sat two taps deep in the\n'
    '           drawer. They are MOVED here out of #edSecondary, never copied --\n'
    '           the drawer builds its rows from that span\'s visible buttons, so a\n'
    '           second copy would have offered every send twice. -->\n'
    '      <button class="btn dark" id="emailDocBtn" data-cri="mail">'
    '<span class="bl">Email to client</span></button>\n'
    '      <button class="btn dark" id="textSignBtn" data-cri="chat" '
    'title="Text the client a link to review and sign">'
    '<span class="bl">Text to sign</span></button>\n'
    '      <button class="btn dark" id="shareBtn" data-cri="paperclip">'
    '<span class="bl">Share link</span></button>\n'
    '      <button class="btn dark" id="edMoreBtn" aria-haspopup="true"'
)

# ------------------------------------------------------------------- 2. CSS
CHIP_OLD = ".edchip.edlink:active{transform:scale(.96);}\n"
CHIP_NEW = (
    ".edchip.edlink:active{transform:scale(.96);}\n"
    "/* 1204 -- the way OUT of the document editor was unlabelled. This chip and\n"
    "   the logo were the only two exits, and both carried the word Back or Home\n"
    "   in a title attribute, which a phone never shows; walk 6 hunted for a\n"
    "   Close/Back/Done for 30 s and found none. The chip now SAYS it, which\n"
    "   costs width -- so it takes its own cap instead of the shared .edchip one,\n"
    "   and #edRepChip beside it is deliberately left at 150px. */\n"
    "#edClientChip{max-width:210px;}\n"
    ".edchip .edbk{color:#ffd9dc;font-weight:900;margin-right:1px;}\n"
)

PHONECHIP_OLD = "  .edchip{height:22px;font-size:11px;padding:0 8px;max-width:30vw;}\n"
PHONECHIP_NEW = (
    "  .edchip{height:22px;font-size:11px;padding:0 8px;max-width:30vw;}\n"
    "  /* 1204: the client chip carries a word the rep tap-targets, so it gets the\n"
    "     room for it. 30vw truncated \"\\2039 Back\" down to the arrow alone. */\n"
    "  #edClientChip{max-width:46vw;}\n"
)

# The phone statuswrap rule in the FIRST 760px block never won: `.toolbar
# .statuswrap` is redeclared unconditionally further down at the same
# specificity, and the later one takes it. Deleting the dead declaration
# rather than out-specifying it, and the live change goes in the block that
# actually comes after that redeclaration.
DEAD_OLD = "  .toolbar .statuswrap{font-size:11px;}\n"
DEAD_NEW = (
    "  /* 1204: a `.toolbar .statuswrap{font-size:11px}` sat here and had never\n"
    "     applied -- the unconditional `.toolbar .statuswrap` below is the same\n"
    "     specificity and comes later in source, so the phone has always drawn\n"
    "     this row at 13px. Deleted rather than out-specified; the phone's real\n"
    "     statuswrap rule now lives in the 760px block below that one. */\n"
)

ORDER_OLD = "  .toolbar #edMoreBtn{display:inline-block;}\n"
ORDER_NEW = (
    "  .toolbar #edMoreBtn{display:inline-block;}\n"
    "  /* 1204: the sends come first. .edbtns is order:2, so ordering the status\n"
    "     row after it makes the phone read Save / Print, then Email / Text /\n"
    "     Share, then \"Mark sent\" -- the manual override last instead of first.\n"
    "     This block is after the unconditional `.toolbar .statuswrap` rule, so\n"
    "     unlike the declaration it replaces, it wins. */\n"
    "  .toolbar .statuswrap{order:3;}\n"
)

# Keep the 1069 banner honest about the split it describes.
BANNER_OLD = (
    "  /* 1069: the phone shows three primaries plus More; the other eight are one\n"
    "     tap away in #edDrawer. Hiding the WRAPPER rather than each button means no\n"
    "     !important is needed to beat the per-button style.display that JS sets. */\n"
)
BANNER_NEW = (
    "  /* 1069: the phone shows the primaries plus More; the rest are one tap away\n"
    "     in #edDrawer. Hiding the WRAPPER rather than each button means no\n"
    "     !important is needed to beat the per-button style.display that JS sets --\n"
    "     which is also why 1204 MOVED the three sends into the primary row rather\n"
    "     than trying to un-hide them from here. */\n"
)

# -------------------------------------------------------------------- 3. JS
CC_OLD = (
        "        cc.innerHTML = (po ? '<small>' + esc(String(po)) + ':</small> ' : '')"
        " + esc(pr.name || 'Client');\n"
        "        cc.style.display = 'inline-flex';\n"
)
CC_NEW = (
        "        /* 1204: the chip says what it does. It was the only labelled-in-a\n"
        "           -title-attribute way back to the client, and a phone never shows\n"
        "           a title. The name stays beside it -- it is also how a rep knows\n"
        "           whose document is open. */\n"
        "        cc.innerHTML = '<b class=\"edbk\">\\u2039 Back</b>'\n"
        "          + (po ? '<small>' + esc(String(po)) + ':</small> ' : '')\n"
        "          + esc(pr.name || 'Client');\n"
        "        cc.title = 'Back to ' + (pr.name || 'the client') + '\\u2019s overview';\n"
        "        cc.style.display = 'inline-flex';\n"
)

# ------------------------------------------------------------------ 4. stamp
STAMP_OLD = ">v2026-09-10 build 1203<"
STAMP_NEW = ">v2026-09-10 build 1204<"

CL_ANCHOR = "var CHANGELOG = [\n"
CL_ENTRY = (
    "  { b: 1204, d: '2026-09-10', "
    "t: 'The published document offers the send, and the way back says Back', "
    "s: 'After you publish an estimate you land in the document editor, and on a phone that "
    "screen had its priorities backwards. <b>The three ways to actually send it \\u2014 Email "
    "to client, Text to sign and Share link \\u2014 were hidden two taps deep under "
    "\\u201c\\u22ef More\\u201d</b>, while the biggest button on the bar was <b>Mark sent</b>, "
    "which sends nothing to anybody. The three sends are now on the bar itself, and Mark sent "
    "has moved below them where an override belongs. <b>And the way out is labelled.</b> The "
    "only exits were the client chip and the logo, and neither said so anywhere a phone could "
    "show it \\u2014 the chip now reads \\u201c\\u2039 Back\\u201d beside the client name.' },\n"
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='index.html')
    ap.add_argument('--dst', default=None)
    a = ap.parse_args()
    dst = a.dst or a.src

    src = pl.load(a.src)
    orig = src

    n_mail_before = src.count('id="emailDocBtn"')
    n_share_before = src.count('id="shareBtn"')
    assert n_mail_before == 1 and n_share_before == 1, (n_mail_before, n_share_before)

    src = pl.sub(src, DROP_MAIL, '')
    src = pl.sub(src, DROP_SHARE, '')
    src = pl.sub(src, MORE_OLD, MORE_NEW)

    src = pl.sub(src, CHIP_OLD, CHIP_NEW)
    src = pl.sub(src, PHONECHIP_OLD, PHONECHIP_NEW)
    src = pl.sub(src, DEAD_OLD, DEAD_NEW)
    src = pl.sub(src, ORDER_OLD, ORDER_NEW)
    src = pl.sub(src, BANNER_OLD, BANNER_NEW)

    src = pl.sub(src, CC_OLD, CC_NEW)

    src = pl.sub(src, STAMP_OLD, STAMP_NEW)
    src = pl.sub(src, CL_ANCHOR, CL_ANCHOR + CL_ENTRY)

    # ---- self-computing assertions, on the artifact rather than on a memory ----
    # Each send still exists exactly once: moved, not duplicated.
    assert src.count('id="emailDocBtn"') == 1, src.count('id="emailDocBtn"')
    assert src.count('id="textSignBtn"') == 1
    assert src.count('id="shareBtn"') == 1

    # ... and each is now OUTSIDE #edSecondary, ahead of #edMoreBtn.
    i_more = src.find('id="edMoreBtn"')
    i_sec = src.find('id="edSecondary"')
    for bid in ('id="emailDocBtn"', 'id="textSignBtn"', 'id="shareBtn"'):
        i = src.find(bid)
        assert i < i_more < i_sec, (bid, i, i_more, i_sec)

    # The drawer source shrank by exactly three buttons.
    def sec_buttons(s):
        j = s.find('<span id="edSecondary">')
        k = s.find('</span>\n      <div id="edDrawer"', j)
        assert j > 0 and k > j, (j, k)
        return s[j:k].count('<button ')
    before, after = sec_buttons(orig), sec_buttons(src)
    assert after == before - 3, (before, after)

    # The dead phone rule is gone and the live one is in the later block.
    assert '.toolbar .statuswrap{font-size:11px;}' not in src
    assert src.count('.toolbar .statuswrap{order:3;}') == 1
    i_uncond = src.find('.toolbar .statuswrap{display:flex;')
    assert 0 < i_uncond < src.find('.toolbar .statuswrap{order:3;}')

    pl.write_atomic(dst, src)
    print('patched  ->', dst)
    print('  secondary buttons %d -> %d' % (before, after))
    print('  delta bytes:', len(src) - len(orig))


if __name__ == '__main__':
    main()
