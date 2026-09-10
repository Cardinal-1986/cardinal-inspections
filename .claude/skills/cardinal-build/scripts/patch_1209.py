#!/usr/bin/env python3
"""Build 1209 — on a phone, the client comes before the money (audit option 9, A6).

Walk 3, phone, 390px: tapping into a client opens on

    Job Value $0.00 · 0% · Balance Due $0.00 · Payment Information ›

and only THEN the name band, with the name cut to "Mark Diamo…". A rep opening a
brand-new lead reads $0.00 twice before finding out whose lead it is. The iPad
puts the name first; the phone did not.

⚠ THIS REVERSES A DECISION, AND THAT IS THE WHOLE POINT OF THE BUILD. Build 797
moved this card ABOVE the name band deliberately — it shipped from preview_v3/v4
and Theo confirmed it on the preview and again live on his phone. The audit
finding was therefore HELD, not shipped, until he chose. He picked the reversal
on 10 Sep 2026. Nothing here is a bug fix; it is his call, applied.

WHAT IS NOT TOUCHED. 797 did two things — it MERGED Job Value/circle with
Payment Information into one full-bleed rectangle, and it MOVED that rectangle
above the name band. Only the second is reversed. The card is still the merged
full-bleed rectangle, still lives in `.wrap` so it keeps its bleed, still
phone-only, still fenced to retail. Desktop and iPad take the identical path
they always did, asserted.

⚠ THE GUARD IS THE DANGEROUS PART, not the insertion point. The settled phone
position becomes `namebar -> card`, so the idempotence test must be
`previousElementSibling === namebar`. Leaving it as `nextElementSibling` would
be a guard that can never be satisfied: every render would reparent the node
again, waking all ~46 body observers each time. That is BUG_CLASSES' 567/569
repaint class, which this file has already paid for twice.

Usage: patch_1209.py --src in.html --dst out.html
"""
import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

# --------------------------------------------------- 1. the placement itself
PLACE_OLD = (
"    var phone = window.matchMedia('(max-width:560px)').matches;\n"
"    if(phone){\n"
"      if(moneyCard.parentNode !== wrapEl || moneyCard.nextElementSibling !== namebar){\n"
"        wrapEl.insertBefore(moneyCard, namebar);\n"
"      }\n"
"    }else if(moneyCard.parentNode !== mount){\n"
)
PLACE_NEW = (
"    var phone = window.matchMedia('(max-width:560px)').matches;\n"
"    if(phone){\n"
"      /* 1209: UNDER the name band, not above it. 797 shipped it above, from\n"
"         preview_v3/v4 and confirmed live; Theo reversed that call on 10 Sep\n"
"         (audit A6 — a rep opening a Lead read “$0.00” twice before the\n"
"         homeowner's name). Everything else about 797 stands: still the merged\n"
"         full-bleed rectangle, still in .wrap so it keeps its bleed, still\n"
"         phone-only, still retail-fenced.\n"
"         ⚠ The guard MUST be previousElementSibling. With the insertion point\n"
"         at namebar.nextSibling the settled position is namebar -> card, so a\n"
"         nextElementSibling test could never be satisfied and every render would\n"
"         reparent the node again, waking every body observer. A guard that\n"
"         cannot succeed is the 567/569 repaint class, twice paid for. */\n"
"      if(moneyCard.parentNode !== wrapEl || moneyCard.previousElementSibling !== namebar){\n"
"        wrapEl.insertBefore(moneyCard, namebar.nextSibling);\n"
"      }\n"
"    }else if(moneyCard.parentNode !== mount){\n"
)

# --------------------------------------------------- 2. the module banner
BANNER_OLD = (
"  /* 797: the Job Value/circle card + Payment Information, merged into one\n"
"     full-bleed card and (phone only) moved above the name band. Not reachable\n"
)
BANNER_NEW = (
"  /* 797: the Job Value/circle card + Payment Information, merged into one\n"
"     full-bleed card and (phone only) reparented beside the name band — ABOVE\n"
"     it at 797, and UNDER it since 1209, which is a decision Theo reversed and\n"
"     not a defect either way. Do not “restore” 797's order on the strength of\n"
"     its own build-log entry; gate_797.mjs section B now asserts the 1209\n"
"     order. Not reachable\n"
)

# --------------------------------------------------- 3. the app stamp
STAMP_OLD = ">v2026-09-10 build 1208<button"
STAMP_NEW = ">v2026-09-10 build 1209<button"

# --------------------------------------------------- 4. the CHANGELOG entry
CL_OLD = "var CHANGELOG = [\n"
CL_NEW = (
"var CHANGELOG = [\n"
"  { b: 1209, d: '2026-09-10', t: 'On a phone, your client comes before the money', "
"s: 'Opening a client on a phone put <b>Job Value $0.00</b>, the percentage circle, "
"<b>Balance Due $0.00</b> and Payment Information above the name band \\u2014 so on a "
"brand-new lead you read <b>$0.00</b> twice before finding out whose lead it was, and "
"the name itself was cut short next to the call and text buttons. The name band is "
"first now and the money card sits directly under it. Nothing was removed and nothing "
"was restyled \\u2014 the card is the same full-bleed rectangle it has been since build "
"797, only lower. Tablet and desktop are untouched.' },\n"
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--dst', required=True)
    a = ap.parse_args()

    src = pl.load(a.src)
    orig = src

    # every edit asserts count == 1 inside pl.sub and aborts before any write
    src = pl.sub(src, PLACE_OLD, PLACE_NEW)
    src = pl.sub(src, BANNER_OLD, BANNER_NEW)
    src = pl.sub(src, STAMP_OLD, STAMP_NEW)
    src = pl.sub(src, CL_OLD, CL_NEW)

    # ---- self-computing assertions: say what must be true, not a number read
    #      off an already-patched tree.

    # the old insertion point is gone from the WHOLE file, not just this block
    assert 'wrapEl.insertBefore(moneyCard, namebar);' not in src, \
        'the pre-1209 insertion point survived somewhere'
    assert src.count('wrapEl.insertBefore(moneyCard, namebar.nextSibling);') == 1

    # the guard flipped, exactly once, and the unsatisfiable one is gone
    assert src.count('moneyCard.previousElementSibling !== namebar') == 1
    assert 'moneyCard.nextElementSibling !== namebar' not in src, \
        'a guard that can never succeed survived — 567/569 repaint class'

    # the DESKTOP path is byte-identical: 1209 is phone-only, and this is the
    # assertion that proves it rather than the commit message claiming it
    DESK = "}else if(moneyCard.parentNode !== mount){\n      mount.insertBefore(moneyCard, moneyCardHomeNext);\n    }"
    assert orig.count(DESK) == 1 and src.count(DESK) == 1, 'desktop path moved'

    # 797's OTHER half — the merge — is untouched at every one of its sites
    for frag in ('moneyCard.appendChild(freshMoney);',
                 'moneyCard.appendChild(payRow);',
                 "moneyCard.id = 'dbMoneyCard';"):
        assert orig.count(frag) == src.count(frag) == 1, 'the 797 merge moved: ' + frag

    # the retail fence and the resize listener still stand
    assert src.count("window.matchMedia('(max-width:560px)').matches") == \
           orig.count("window.matchMedia('(max-width:560px)').matches")
    assert src.count('moneyRz = setTimeout') == 1

    # exactly one build stamp moved; every frozen module banner stayed frozen
    assert orig.count('build 1208') - src.count('build 1208') == 1
    assert src.count('>v2026-09-10 build 1209<button') == 1

    # one changelog entry added, and 1208's is still there under it
    assert src.count('{ b: 1209,') == 1
    assert src.count('{ b: 1208,') == orig.count('{ b: 1208,') == 1

    # nothing else in the file moved: the delta is only what we spliced
    grew = len(src) - len(orig)
    print('grew by %d characters' % grew)

    pl.write_atomic(a.dst, src)
    pl.assert_in(a.dst, 'wrapEl.insertBefore(moneyCard, namebar.nextSibling);')
    pl.assert_in(a.dst, '>v2026-09-10 build 1209<button')
    print('wrote', a.dst)


if __name__ == '__main__':
    main()
