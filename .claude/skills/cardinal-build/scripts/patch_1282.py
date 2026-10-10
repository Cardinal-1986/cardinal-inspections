"""Build 1282 — the hammer watermark comes off Next 30 Days (Theo: "3" = remove it).

1183 wired the cardinal-on-a-hatchet artwork behind the home schedule card. On Theo's
monitor it read as a big pink bird over the dates. Deleted at source: the ::before
paint, its dark-mode opacity twin, and the content lift that existed only to keep the
dates above it. The card keeps position:relative/overflow:hidden (harmless, and other
gates read .prodcal). cardinal-prod.png is deleted from the repo — nothing references it.

Usage: python3 patch_1282.py [index.html]
"""
import os, sys, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

# 1. the lift + the ::before paint (keep the host rule)
a = src.index("/* ⚠ AND THE CONTENT HAS TO BE LIFTED, or the watermark paints ON TOP OF THE")
end_marker = "mask:url(/cardinal-prod.png) center 60% / 74% no-repeat;\n  opacity:.24;pointer-events:none;z-index:5;}\n"
b = src.index(end_marker, a) + len(end_marker)
assert src.count(end_marker) == 1 and b - a < 2000
src = src[:a] + ("/* 1282: the hammer watermark is gone (Theo, 10 Oct: remove it). The lift that kept\n"
                 "   the dates above it went with it; the host rule above stays, harmlessly. */\n") + src[b:]

# 2. its dark-mode opacity twin
twin = ("/* 1183: the same correction for the hammer. The .24 in the base rule was drawn\n"
        "   for teamcal's white paper card; on the navy ground the schedule card actually\n"
        "   has, it reads as a dark smudge rather than a watermark. Measured at .24/.18/\n"
        "   .14/.10 and rendered — .14 shows the artwork and leaves the dates clean. */\n"
        ":root:not([data-theme=\"rb-light\"]) body:not(.claim-insurance):not(.claim-community) .pipecard.prodcal::before{\n"
        "  opacity:.14;\n}\n")
src = pl.sub(src, twin, "")
assert 'cardinal-prod.png' not in src

src = pl.sub(src, '">v2026-10-10 build 1281<button', '">v2026-10-10 build 1282<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1281,",
  "var CHANGELOG = [\n"
  "  { b: 1282, d: '2026-10-10', t: 'The bird is off the calendar',\n"
  "    s: 'The big cardinal-on-a-hammer drawing behind Next 30 Days on the home screen is gone, so the dates sit on a plain card. The Team Calendar keeps its own pencil drawing.' },\n"
  "  { b: 1281,")
pl.write_atomic(PATH, src)
print('patched 1282')
