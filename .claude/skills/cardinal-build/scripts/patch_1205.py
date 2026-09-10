#!/usr/bin/env python3
"""Build 1205 — the estimate builder's toolbar, at the tap-target floor.

Audit finding A11 / option 10. Walk 1 measured the header of `#cr-est-view` — the
screen where a rep types money — and found the smallest targets in the app:

    Close 72x26 · Preview 88x26 · Options 86x26 · -> Contract 117x26
    Publish 85x26 · Save Draft 111x26 · the line-item adds 26-28px

against the 44px floor the rest of the app moved to. And `.cr-est-head` is
`overflow-x:auto`, so at 390px "-> Contract" sat off the right edge with nothing
on screen to say it was there.

Two changes, both at source rather than out-specified:

  1. `.cr-est-head button` and `.cr-est-items-head button` take `min-height:44px`
     and centre their own label. The buttons are built by THREE different modules
     (the base render, `cr-epub`'s Preview/Options/Publish, `cr-e2c`'s
     -> Contract) into one flex row, so a rule on the row is the only place one
     edit reaches all of them.
  2. On a phone the row WRAPS instead of scrolling — the h2 takes its own line,
     the buttons fall under it, and nothing sits off-screen. A fade hint was the
     other option in the audit; wrapping needs no hint at all.

⚠ NOT touched, deliberately: `.cr-est-phonebar` (1029) already puts Save Draft
and Publish under the thumb at 44px+, so the header is the SECONDARY set on a
phone and does not need to compete with it.

Usage: patch_1205.py --src in.html --dst out.html
"""
import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

HEAD_BTN_OLD = (
    ".cr-est-head button{background:transparent;border:1px solid rgba(200,32,46,.5);"
    "color:#f08a90;padding:6px 12px;border-radius:6px;"
    "font:800 11px 'Segoe UI',Arial,sans-serif;letter-spacing:.14em;"
    "text-transform:uppercase;cursor:pointer;font-family:inherit;flex:0 0 auto}"
)
HEAD_BTN_NEW = (
    ".cr-est-head button{background:transparent;border:1px solid rgba(200,32,46,.5);"
    "color:#f08a90;padding:0 14px;min-height:44px;display:inline-flex;"
    "align-items:center;justify-content:center;border-radius:6px;"
    "font:800 11px 'Segoe UI',Arial,sans-serif;letter-spacing:.14em;"
    "text-transform:uppercase;cursor:pointer;font-family:inherit;flex:0 0 auto}"
)

ITEMS_BTN_OLD = (
    ".cr-est-items-head button{padding:7px 12px;border-radius:6px;border:0;"
    "font:800 11px 'Segoe UI',Arial,sans-serif;letter-spacing:.06em;"
    "cursor:pointer;font-family:inherit}"
)
ITEMS_BTN_NEW = (
    ".cr-est-items-head button{padding:0 13px;min-height:44px;display:inline-flex;"
    "align-items:center;justify-content:center;border-radius:6px;border:0;"
    "font:800 11px 'Segoe UI',Arial,sans-serif;letter-spacing:.06em;"
    "cursor:pointer;font-family:inherit}"
)

# The phone rule goes immediately after the last .cr-est-head declaration in
# this stylesheet, so the whole header lives in one place.
WRAP_ANCHOR = ".cr-est-head button.primary:disabled{opacity:.55;cursor:wait}"
WRAP_NEW = (
    ".cr-est-head button.primary:disabled{opacity:.55;cursor:wait}"
    "\n/* 1205 -- on a phone the toolbar WRAPS; it does not scroll. `.cr-est-head`\n"
    "   carries overflow-x:auto (added later, in the 1073 layout sheet), so at\n"
    "   390px `-> Contract` sat off the right edge with nothing on screen to say\n"
    "   it was there. Wrapping needs no scroll hint, which was the other option\n"
    "   put to Theo. The h2 takes its own line so the buttons fall under it in\n"
    "   reading order; the overflow-x rule is left alone because wrapped content\n"
    "   never overflows, so it is inert rather than wrong.\n"
    "   ⚠ The three modules that inject into this row -- the base render,\n"
    "   cr-epub (Preview/Options/Publish) and cr-e2c (-> Contract) -- all get\n"
    "   this for free, which is why the rule is on the ROW and not on a list of\n"
    "   button ids that would go stale the next time one is added. */\n"
    "@media (max-width:760px){\n"
    "  .cr-est-head{flex-wrap:wrap;}\n"
    "  .cr-est-head h2{flex:1 1 100%;order:-1;}\n"
    "}\n"
)

STAMP_OLD = ">v2026-09-10 build 1204<"
STAMP_NEW = ">v2026-09-10 build 1205<"

CL_ANCHOR = "var CHANGELOG = [\n"
CL_ENTRY = (
    "  { b: 1205, d: '2026-09-10', "
    "t: 'The estimate builder\\u2019s buttons are big enough to hit', "
    "s: 'On the screen where you type money, the toolbar buttons were "
    "<b>26 pixels tall</b> \\u2014 the smallest targets in the app, on a phone, "
    "often on a roof. Close, Preview, Options, \\u2192 Contract and Save Draft are "
    "now a full <b>44 pixels</b>, and so are the three Add buttons above the line "
    "items. <b>And the row wraps instead of scrolling sideways.</b> At phone width "
    "\\u201c\\u2192 Contract\\u201d used to sit off the right-hand edge of the screen "
    "with nothing to tell you it was there; the title now takes its own line and "
    "every button is visible under it. Save Draft and Publish are still under your "
    "thumb at the bottom, where they have been since build 1029.' },\n"
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='index.html')
    ap.add_argument('--dst', default=None)
    a = ap.parse_args()
    dst = a.dst or a.src

    src = pl.load(a.src)
    orig = src

    src = pl.sub(src, HEAD_BTN_OLD, HEAD_BTN_NEW)
    src = pl.sub(src, ITEMS_BTN_OLD, ITEMS_BTN_NEW)
    src = pl.sub(src, WRAP_ANCHOR, WRAP_NEW)
    src = pl.sub(src, STAMP_OLD, STAMP_NEW)
    src = pl.sub(src, CL_ANCHOR, CL_ANCHOR + CL_ENTRY)

    # self-computing: exactly one 26px-era padding disappeared from each rule,
    # and no OTHER rule in the file gained a min-height by accident.
    assert orig.count('padding:6px 12px') - src.count('padding:6px 12px') == 1
    assert orig.count('padding:7px 12px') - src.count('padding:7px 12px') == 1
    assert src.count('min-height:44px') == orig.count('min-height:44px') + 2, (
        orig.count('min-height:44px'), src.count('min-height:44px'))
    assert src.count('.cr-est-head{flex-wrap:wrap;}') == 1
    # the overflow-x rule this build reasons about is still there, untouched
    assert src.count('.cr-est-head{overflow-x:auto;overscroll-behavior-x:contain}') == 1

    pl.write_atomic(dst, src)
    print('patched  ->', dst)
    print('  delta bytes:', len(src) - len(orig))


if __name__ == '__main__':
    main()
