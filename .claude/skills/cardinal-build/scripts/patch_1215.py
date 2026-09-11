#!/usr/bin/env python3
"""Build 1215 - the sign-in box loses its own mark too.

Theo, on the 1213 change: "on pick 1 please remove logo." 1213 took the hero
panel off the LEFT of the sign-in screen on his word "just the sign in box"; the
box itself still opened with a wordmark above the heading. That goes now, so the
card starts at "Team sign in".

WHAT IS ACTUALLY BEING REMOVED, because the size is not obvious from the markup:
the mark was an inline base64 SVG, a single tag 16,428 characters long. It is not
a file, nothing fetches it, and no other surface shares it - three references in
the whole document, all of them in this section: the tag, and two rules that
style it. All three go together, so no orphan rule is left to confuse a later
reader or to be "fixed" back into use.

⚠ NOTHING IN JAVASCRIPT TOUCHES IT, and that had to be established rather than
assumed - this file has already lost a day to a removed image whose only readers
found it by regex out of a host constant (1182, and the warning at the top of
CLAUDE.md). Checked: the boot block writes `brandLogo` and `editorLogo` and never
this one; it is not read out of any template; and it is not named in a fallback
chain. The daily quote lives in that same boot block ABOVE the logo loop, which
is the exact pairing that broke at 1182 - it is untouched here, and gate_1215
proves the quote still renders.

⚠ THE ID IS DELIBERATELY NOT WRITTEN IN ANY COMMENT ADDED BY THIS PATCH. The
patch asserts the name disappears from the file, and prose carrying it would both
fail that assertion and make every future search report a reference that is not
one. BUG_CLASSES 96; it has cost this file five rounds in one build already.

Usage: patch_1215.py --src in.html --dst out.html
"""
import argparse, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

BUILD_OLD, BUILD_NEW = 1214, 1215
DATE = '2026-09-11'

# Identifiers this patch counts. Any of these appearing in a COMMENT the patch
# writes would break the patch's own assertions - see no_planted_identifiers().
COUNTED = ['loginlogo', 'loginLogo', 'logincard', 'brandLogo', 'editorLogo',
           'loginQuote', 'loginsep', '<img', '<script', '</script>']

# --------------------------------------------------------------- 1. the tag
TAG_RE = re.compile(r'\n    <img class="loginlogo" id="loginLogo"[^>]*>')
TAG_NEW = (
'\n    <!-- 1215: the box opens on its heading now. Theo, on the 1213 change:\n'
'         "on pick 1 please remove logo" - 1213 cleared the left of the screen,\n'
'         this clears the card. What stood here was an inline base64 SVG mark,\n'
'         one tag 16,428 characters long, styled by two rules that went with it.\n'
'         Nothing in script read it (the boot block writes the header and editor\n'
'         marks, which are different elements and are untouched), so there is no\n'
'         chain to repair - but check for one before removing any embedded asset\n'
'         here, because a reader that finds its target by regex leaves no name to\n'
'         grep for. See the top of CLAUDE.md. -->'
)

# --------------------------------------------------------- 2. the two rules
RULE_A = '\n.logincard .loginlogo{display:block;margin:0 auto 16px;max-width:250px;height:auto;}'
RULE_A_NEW = ''

RULE_B = ('\n.logincard .loginlogo{background:transparent;border-radius:0;padding:0;\n'
          '  filter:drop-shadow(0 4px 12px rgba(0,0,0,.45));}')
RULE_B_NEW = ''

# ------------------------------------------------------------ 3. changelog
CL_ANCHOR = 'var CHANGELOG = [\n'
CL_NEW = (
"var CHANGELOG = [\n"
"  { b: %d, d: '%s', t: 'The sign in box stands on its own',\n"
"    s: 'The Cardinal mark above <b>Team sign in</b> is gone, so the box now opens straight "
"on the heading. This finishes the change from the last build, which cleared the photograph "
"and wordmark off the left-hand side of the sign in screen &#8212; the card itself was still "
"carrying a mark of its own. Nothing else on the screen moved: the email and password fields, "
"<b>Remember me</b>, <b>Forgot password?</b>, the clock and the daily quote are all exactly "
"where they were.' },\n" % (BUILD_NEW, DATE)
)


def no_planted_identifiers():
    """Only the PROSE is checked. A counted identifier is fine in code and only
    ever wrong in a comment, so scanning a whole replacement string would flag
    real markup the build exists to write - a check that fails correct work,
    which is the very thing this guard was written to stop."""
    def comment_lines(text):
        out, in_block = [], False
        for line in text.split('\n'):
            t = line.strip()
            if in_block:
                out.append(line)
                if '*/' in t or '-->' in t: in_block = False
                continue
            if t.startswith('//') or t.startswith('*'):
                out.append(line)
            elif t.startswith('/*') or t.startswith('<!--'):
                out.append(line)
                if not ('*/' in t or '-->' in t): in_block = True
        return '\n'.join(out)

    bad = []
    for name, text in sorted(globals().items()):
        if not (name.endswith('_NEW') and isinstance(text, str)):
            continue
        prose = comment_lines(text)
        for ident in COUNTED:
            if ident in prose:
                bad.append('%s: a COMMENT line contains %r' % (name, ident))
    assert not bad, ('an explanatory comment plants an identifier this patch counts, '
                     'so a correct edit would fail its own assertion. REWORD THE PROSE, '
                     'do not weaken the check:\n  ' + '\n  '.join(bad))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--dst', required=True)
    a = ap.parse_args()

    no_planted_identifiers()

    src = pl.load(a.src)
    orig = src

    # Self-computing preconditions, read off the SOURCE rather than typed in.
    n_class = orig.count('loginlogo')
    n_id    = orig.count('loginLogo')
    assert n_class == 3, 'expected 3 class references (1 tag + 2 rules), found %d' % n_class
    assert n_id == 1, 'expected the id exactly once, found %d' % n_id

    tags = TAG_RE.findall(orig)
    assert len(tags) == 1, 'the mark is not a single tag: found %d' % len(tags)
    print('removing a tag of %d characters' % len(tags[0].strip()))

    src = TAG_RE.sub(lambda _m: TAG_NEW, src, count=1)
    src = pl.sub(src, RULE_A, RULE_A_NEW)
    src = pl.sub(src, RULE_B, RULE_B_NEW)

    # stamp + changelog
    src = pl.sub(src, 'v%s build %d' % (DATE, BUILD_OLD), 'v%s build %d' % (DATE, BUILD_NEW))
    src = pl.sub(src, CL_ANCHOR, CL_NEW)

    # ---- postconditions, all computed against the original ----
    assert src.count('loginlogo') == 0, 'a class reference survived'
    assert src.count('loginLogo') == 0, 'the id survived'
    # everything else on the card is untouched
    for ident in ['loginEmail', 'loginPassword', 'loginBtn', 'rememberMe',
                  'forgotLink', 'loginClock', 'loginQuote', 'loginsep',
                  'brandLogo', 'editorLogo', 'CARDINAL_LOGO_SRC']:
        assert src.count(ident) == orig.count(ident), \
            '%s moved: %d -> %d' % (ident, orig.count(ident), src.count(ident))
    # exactly one tag left the document
    assert src.count('<img') == orig.count('<img') - 1, 'more than one image tag changed'
    assert src.count('<script') == orig.count('<script'), 'a script tag moved'
    assert src.count('</script>') == orig.count('</script>'), 'a script close moved'
    # The size change is COMPUTED from the edits, not typed in - a hand-written
    # window is read off an already-patched tree and drifts the moment a comment
    # is reworded. This is exact and fails on any byte the patch did not intend.
    delta = len(orig) - len(src)
    removed = len(tags[0]) + len(RULE_A) + len(RULE_B)
    added = len(TAG_NEW) + (len(CL_NEW) - len(CL_ANCHOR))
    assert delta == removed - added, \
        'size change %d is not the %d removed minus the %d added' % (delta, removed, added)
    print('file shrank by %d characters (%d out, %d in)' % (delta, removed, added))

    pl.write_atomic(a.dst, src)
    pl.assert_in(a.dst, '1215: the box opens on its heading now')
    pl.assert_in(a.dst, 'v%s build %d' % (DATE, BUILD_NEW))
    print('wrote', a.dst)


if __name__ == '__main__':
    main()
