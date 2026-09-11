#!/usr/bin/env python3
"""Build 1213 - the sign-in screen loses the panel on its left.

Theo, 11 Sep 2026: "How about no logo at all on the left of the sign in. Just
the sign in box."

WHAT THE LEFT ACTUALLY IS, measured rather than guessed. My first probe reported
`loginShown:false` and told me nothing, because the e2e mock signs you straight
in - so it measured the app, not the sign-in screen. Rendered signed-out with a
no-session client and the view forced open, at 1440 and 390:

    .loginhero   x=341  w=560  h=809   <- THE LEFT PANEL (desktop only)
    .logincard   x=987  w=400  h=625   <- the sign-in box
    #loginQuote  hidden on desktop     <- see below, this is the catch

The left panel is `wm-home.jpeg` (50,960 bytes) plus the CARDINAL wordmark,
ROOFING & RENOVATIONS, the motto, the daily quote and a clock. It is gated to
`@media (min-width:901px)`, so a phone never sees it. This build removes it, and
the box centres itself - `#loginView` is already `display:flex` with
`justify-content:center`, so one child lands in the middle with no new rule.

⚠ THE CATCH, AND IT WOULD HAVE COST THE DAILY QUOTE. The desktop block carries:

    #loginView.open .loginsep, #loginView.open #loginQuote{display:none;}

with the comment "card sheds its quote block on desktop - the hero carries the
art". Delete the hero and leave that rule and the quote disappears on desktop
entirely, silently, because the element it moved to no longer exists. The rule
goes with the panel that justified it, so the card keeps its own quote at every
width - which is also how the phone already works. Build 1182 lost that quote
for a different reason and it was worth a warning in CLAUDE.md; not losing it
twice.

⚠ `wm-home.jpeg` IS FETCHED ON A PHONE TODAY, where it is never shown - an
`<img src>` inside a `display:none` subtree still downloads. So this saves 51 KB
on every device, not just the desktop it was visible on. Measured in the render
above, not assumed. THE FILE ITSELF IS NOT DELETED: it becomes unreferenced, and
CLAUDE.md's own rule is that an asset is not unreferenced just because nothing
names it. Deleting a root file is Theo's call and a separate build.

The two JS writers - `heroClock` in the clock tick and the `heroQuote` mirror -
are both guarded (`if(hc)`, `if(hq)`), so nothing throws either way. They are
removed anyway rather than left pointing at elements that no longer exist: build
807's five-site retire checklist is exactly about dangling references surviving
a deletion.

Usage: patch_1213.py --src in.html --dst out.html
"""
import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

# ------------------------------------------------------------------ markup
HERO_OLD = (
'  <div class="loginhero">\n'
'    <img class="heroart" src="/wm-home.jpeg" alt="">\n'
'    <div class="heroname">CARDINAL</div>\n'
'    <div class="herosub">ROOFING &amp; RENOVATIONS</div>\n'
'    <div class="heromotto">&#8220;The Single Source Of Truth&#8221;</div>\n'
'    <p id="heroQuote"></p>\n'
'    <div id="heroClock"></div>\n'
'  </div>\n'
)
HERO_NEW = (
'  <!-- 1213: the left-hand hero panel is GONE on Theo\'s word - "no logo at all\n'
'       on the left of the sign in. Just the sign in box." It was desktop-only\n'
'       (min-width:901px) and carried a hero photograph, the CARDINAL wordmark,\n'
'       the motto, the daily quote and a clock. The box centres itself:\n'
'       #loginView is already flex with justify-content:center, so one child\n'
'       needs no new rule.\n'
'       ⚠ That photograph was downloaded on PHONES TOO, where it was never shown\n'
'       - an <img src> inside a display:none subtree still fetches. The file is\n'
'       left in the repo; retiring a root asset is its own call.\n'
'       ⚠ Its FILENAME is deliberately not written here. The patch asserts the\n'
'       name appears nowhere in the file, which is what proves the tag is gone -\n'
'       and naming it in prose would both break that check and make every future\n'
'       grep report a reference that is not one. It is in the build log. -->\n'
)

# ------------------------------------------------------------------ stylesheet
CSS_OLD = (
'.loginhero{display:none;}\n'
)
CSS_NEW = ''

BLOCK_OLD = (
'  .loginhero{display:flex;flex-direction:column;align-items:center;text-align:center;max-width:660px;}\n'
)

QUOTE_OLD = (
'  /* card sheds its quote block on desktop — the hero carries the art */\n'
'  #loginView.open .loginsep, #loginView.open #loginQuote{display:none;}\n'
)
QUOTE_NEW = (
'  /* 1213: the card KEEPS its quote and rule on desktop now. This used to hide\n'
'     both, because the hero beside it carried the quote - and with the hero gone\n'
'     that rule would have deleted the daily quote from the desktop sign-in\n'
'     silently, by hiding an element whose replacement no longer exists. The\n'
'     phone has always shown them here; desktop now matches. */\n'
)

# ------------------------------------------------------------------ dead writers
CLOCK_OLD = (
"  var hc = document.getElementById('heroClock');\n"
"  if(hc) hc.textContent = txt;\n"
)
CLOCK_NEW = ''

MIRROR_OLD = (
"    var hq = document.getElementById('heroQuote');\n"
"    if(hq) hq.innerHTML = lq.innerHTML;\n"
)
MIRROR_NEW = ''

STAMP_OLD = ">v2026-09-10 build 1212<button"
STAMP_NEW = ">v2026-09-11 build 1213<button"

CL_OLD = "var CHANGELOG = [\n"
CL_NEW = (
"var CHANGELOG = [\n"
"  { b: 1213, d: '2026-09-11', t: 'The sign-in screen is just the sign-in box now', "
"s: 'On a computer the sign-in screen used to put a big picture and the Cardinal name down the "
"left, with the box off to the right. That whole left side is gone \\u2014 it is just the sign-in "
"box, in the middle of the screen. <b>On a phone nothing changes</b>, because the left side never "
"appeared there anyway. The daily quote stays: it now sits under the box on a computer, exactly "
"where it already sat on a phone. One small bonus \\u2014 the picture that used to sit on the left "
"was being downloaded on phones too, where nobody could see it, so every sign-in is now a little "
"quicker on every device.' },\n"
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--dst', required=True)
    a = ap.parse_args()

    src = pl.load(a.src)
    orig = src

    # the only reference to the hero art anywhere in the repo is this markup
    assert orig.count('wm-home.jpeg') == 1, \
        'wm-home.jpeg is referenced %d times - read them before removing the img' % orig.count('wm-home.jpeg')

    src = pl.sub(src, HERO_OLD, HERO_NEW)
    src = pl.sub(src, CSS_OLD, CSS_NEW)
    src = pl.sub(src, BLOCK_OLD, '')
    src = pl.sub(src, QUOTE_OLD, QUOTE_NEW)
    src = pl.sub(src, CLOCK_OLD, CLOCK_NEW)
    src = pl.sub(src, MIRROR_OLD, MIRROR_NEW)

    # the remaining hero-only rules go too - each is asserted individually so a
    # missing one aborts rather than leaving a dead selector behind
    for sel in ('.heroart{', '.heroname{', '.herosub{', '.heromotto{'):
        i = src.index('  ' + sel)
        j = src.index('\n', i) + 1
        src = src[:i] + src[j:]
    for block_start in ('  #heroQuote{',):
        i = src.index(block_start)
        j = src.index('color:#7a4f00;/* 685: was gradient-clipped text */}\n', i) + \
            len('color:#7a4f00;/* 685: was gradient-clipped text */}\n')
        src = src[:i] + src[j:]
    for one_liner in ('  #heroQuote span{', '  #heroClock{'):
        i = src.index(one_liner)
        j = src.index('\n', i) + 1
        src = src[:i] + src[j:]

    src = pl.sub(src, STAMP_OLD, STAMP_NEW)
    src = pl.sub(src, CL_OLD, CL_NEW)

    # ---- what must be GONE ------------------------------------------------
    for gone in ('wm-home.jpeg', 'class="heroart"', 'class="heroname"', 'class="herosub"',
                 'class="heromotto"', 'id="heroQuote"', 'id="heroClock"',
                 '.loginhero', '.heroart{', '.heroname{', '.herosub{', '.heromotto{',
                 '#heroQuote', '#heroClock'):
        assert gone not in src, 'still present after the removal: ' + gone

    # ---- what must SURVIVE, and this half is the point --------------------
    #      the box, its own logo, every control on it, and the quote machinery
    for keep in ('<div class="logincard">', 'id="loginLogo"', '<h2>Team sign in</h2>',
                 'id="loginEmail"', 'id="loginPassword"', 'id="loginBtn"',
                 'id="rememberMe"', 'id="forgotLink"', 'id="loginError"',
                 'id="loginClock"', 'class="loginsep"', 'id="loginQuote"',
                 '#loginView.open .logincard{width:400px;flex:0 0 auto;}',
                 "var lq = document.getElementById('loginQuote');",
                 'LOGIN_QUOTES[dy % LOGIN_QUOTES.length]'):
        assert keep in src, 'the sign-in box lost something it needs: ' + keep

    # the desktop hide is gone; nothing else started hiding the quote
    assert '#loginView.open .loginsep' not in src
    assert src.count('id="loginQuote"') == orig.count('id="loginQuote"') == 1

    # the clock tick keeps its other three consumers
    for cid in ("getElementById('qClock')", "getElementById('loginClock')",
                "getElementById('ctClock')"):
        assert orig.count(cid) == src.count(cid), 'the clock tick lost a consumer: ' + cid

    assert orig.count('build 1212') - src.count('build 1212') == 1
    assert src.count('{ b: 1213,') == 1
    assert src.count('{ b: 1212,') == orig.count('{ b: 1212,') == 1
    # ⚠ NOT "the file got smaller". The SCREEN only loses things, but the file
    #   also gains a CHANGELOG entry and two explanatory comments, and those are
    #   bigger than the markup removed. Asserting a smaller file failed correct
    #   code. Bound the growth against what was actually added instead.
    grew = len(src) - len(orig)
    budget = len(CL_NEW) - len(CL_OLD) + len(HERO_NEW) + len(QUOTE_NEW)
    assert grew <= budget, 'grew %d chars, more than the changelog + comments (%d)' % (grew, budget)
    assert grew < budget, 'nothing was removed at all - the deletions did not land'

    pl.write_atomic(a.dst, src)
    pl.assert_in(a.dst, '>v2026-09-11 build 1213<button')
    print('index.html %d chars (%+d) - hero panel, its CSS, the desktop quote-hide '
          'and two dead writers removed' % (len(src), len(src) - len(orig)))


if __name__ == '__main__':
    main()
