#!/usr/bin/env python3
"""Build 1206 — the tap-target sweep (audit option 14 / A13, A3).

MEASURED FIRST, IN A REAL ENGINE, ACROSS ALL 32 SENTINEL STATES. The probe walks
every interactive element at 390px and reports the EFFECTIVE hit area, not the
box — it steps outward from the centre until elementFromPoint stops resolving to
the element, so a `::after` hit pad counts for what it is worth.

⚠ THAT DISTINCTION KILLED ONE OF THE AUDIT'S OWN FINDINGS. A13 records
"Dispatch's 'Move this job' control 15x15" as the worst target in the app. Its
box IS 15x15 — and `#cr-disp .job .mv::after{position:absolute;inset:-15px}` makes
it **45x45 to a thumb**, which build 1040 did on purpose and wrote the arithmetic
down beside ("-9px made 33px effective — under the 44 floor the rest of the app
holds"). It is a FALSE POSITIVE and is deliberately not touched here.

The four real ones from A13/A3, plus one of mine:

  #navMenu .cr-ts button      34x34 -> 44   the drawer's A / A / A size control
  #cr-pae-tabs button         30 tall -> 44 the photo album's section chips
  #cr-pb .pbmonth .pbday      34 tall -> 44 the Production mini-month day cells
  .pf-chip                    38 tall -> 44 the lead-source chips (A3)
  .toolbar .edbtns .btn       42 tall -> 44 ⚠ MINE, from 1204: the document
                                            editor's phone buttons landed 2px
                                            under the floor and I did not measure
                                            them until this build's probe

⚠ The drawer one is doctrine, not taste: `cr-drawer-styles` already carries
"44px, not 40: 592 pushed every control to a 44px tap target and 1076 had to come
back for .lnav-out and the CRM switcher... A new control arriving at 40 would be
the third time." The A/A/A control was simply never included.

Everything else the probe found is BASELINED by gate_1206, not fixed: it may fall
and can never grow.

Usage: patch_1206.py --src in.html --dst out.html
"""
import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

TS_OLD = ("#navMenu .cr-ts button{min-width:34px;min-height:34px;padding:0 9px;cursor:pointer;")
TS_NEW = ("/* 1206: 44, not 34. cr-drawer-styles already says why -- 592 took every\n"
          "   drawer control to a 44px tap target and 1076 had to come back for\n"
          "   .lnav-out and the CRM switcher. The A/A/A size control was never\n"
          "   included, and it is the control someone reaches for BECAUSE they are\n"
          "   having trouble hitting things. */\n"
          "#navMenu .cr-ts button{min-width:44px;min-height:44px;padding:0 9px;cursor:pointer;")

PAE_OLD = "#cr-pae-tabs button{background:#f0e8d0;color:#5c5c5c;border:0;padding:8px 14px;border-radius:8px;"
PAE_NEW = ("#cr-pae-tabs button{background:#f0e8d0;color:#5c5c5c;border:0;padding:0 14px;"
           "min-height:44px;display:inline-flex;align-items:center;border-radius:8px;")

PB_OLD = "#cr-pb .pbmonth .pbday{ min-height:34px; padding:5px 2px 4px;"
PB_NEW = ("/* 1206: 44px, measured at 47x33 on a phone. The desktop cell is 78px and is\n"
          "   untouched -- this is the mini month on the Production landing, which is a\n"
          "   grid of buttons a thumb picks a day from. Six rows, so the landing grows\n"
          "   ~60px; that is the cost of the day being hittable. */\n"
          "#cr-pb .pbmonth .pbday{ min-height:44px; padding:5px 2px 4px;")

PF_OLD = "font:700 12.5px 'Segoe UI',Arial,sans-serif;white-space:nowrap;min-height:38px;"
PF_NEW = "font:700 12.5px 'Segoe UI',Arial,sans-serif;white-space:nowrap;min-height:44px;"

ED_OLD = ".toolbar .edbtns .btn{width:100%;justify-content:flex-start;padding:11px 14px;font-size:13px;}"
ED_NEW = ("/* 1206: 44, not 42. These are MY buttons from 1204 -- the three sends made\n"
          "     primary on the phone -- and 11px of padding on 13px type lands two\n"
          "     pixels under the floor. I did not measure them until this build's probe\n"
          "     walked every state; a fix that stops one pixel short is the class this\n"
          "     sweep exists for. */\n"
          "  .toolbar .edbtns .btn{width:100%;justify-content:flex-start;padding:11px 14px;"
          "min-height:44px;font-size:13px;}")

STAMP_OLD = ">v2026-09-10 build 1205<"
STAMP_NEW = ">v2026-09-10 build 1206<"

CL_ANCHOR = "var CHANGELOG = [\n"
CL_ENTRY = (
    "  { b: 1206, d: '2026-09-10', "
    "t: 'Five more controls big enough for a thumb', "
    "s: 'A sweep of every screen in the app, measured on a phone, looking for anything "
    "too small to hit reliably with a thumb. Five were: <b>the A / A / A text-size "
    "buttons in the menu</b> (the control you reach for precisely because you are "
    "struggling to hit things), <b>the photo album\\u2019s section chips</b>, <b>the day "
    "squares on the Production mini-calendar</b>, <b>the lead-source chips on the new-lead "
    "form</b>, and <b>the document editor\\u2019s own buttons</b>, which build 1204 left two "
    "pixels short. All five are now the full 44 pixels. Nothing was renamed and nothing "
    "moved. <b>The Dispatch grip was checked and is fine</b> \\u2014 it looks tiny but "
    "carries an invisible pad that makes it 45 across, which is why it was left alone.' },\n"
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='index.html')
    ap.add_argument('--dst', default=None)
    a = ap.parse_args()
    dst = a.dst or a.src

    src = pl.load(a.src)
    orig = src

    src = pl.sub(src, TS_OLD, TS_NEW)
    src = pl.sub(src, PAE_OLD, PAE_NEW)
    src = pl.sub(src, PB_OLD, PB_NEW)
    src = pl.sub(src, PF_OLD, PF_NEW)
    src = pl.sub(src, "  " + ED_OLD, ED_NEW)
    src = pl.sub(src, STAMP_OLD, STAMP_NEW)
    src = pl.sub(src, CL_ANCHOR, CL_ANCHOR + CL_ENTRY)

    # five rules gained the floor, and nothing else did. Self-computing rather
    # than a number read off an already-patched tree: five sites is five sites.
    assert src.count('min-height:44px') == orig.count('min-height:44px') + 5, (
        orig.count('min-height:44px'), src.count('min-height:44px'))
    # two of them were 34px before (the size control and the day cell) and one
    # was 38 (the source chip); the other two had no min-height at all.
    assert src.count('min-height:34px') == orig.count('min-height:34px') - 2, (
        orig.count('min-height:34px'), src.count('min-height:34px'))
    assert src.count('min-height:38px') == orig.count('min-height:38px') - 1, (
        orig.count('min-height:38px'), src.count('min-height:38px'))
    assert src.count('min-width:34px;min-height:34px') == 0
    assert src.count('min-width:44px;min-height:44px;padding:0 9px') == 1
    assert 'min-height:38px;\n  transition:background .12s,color .12s,border-color .12s;' not in src
    # the deliberate false positive is untouched, and asserted so
    PAD = '#cr-disp .job .mv::after{ content:""; position:absolute; inset:-15px; }'
    assert src.count(PAD) == orig.count(PAD) == 1, (orig.count(PAD), src.count(PAD))

    pl.write_atomic(dst, src)
    print('patched  ->', dst)
    print('  delta bytes:', len(src) - len(orig))


if __name__ == '__main__':
    main()
