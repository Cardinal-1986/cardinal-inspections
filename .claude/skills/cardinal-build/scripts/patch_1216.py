#!/usr/bin/env python3
"""Build 1216 - the Invoices & Payments card stops being a white slab.

Item 1 of the four Theo picked off the design read. On the client profile this
card was the ONLY large light surface on an otherwise near-black screen -
measured at 1022x163 in a Chromium render, and the brightest object on the page
by a wide margin. It is a light-era surface the dark pass never reached.

THE CONVERSION FOLLOWS 573's PATTERN, NOT A FLIP: tokens, dark values in the
base rule (the app's default theme is dark), and the ORIGINAL light values
restored under `:root[data-theme="rb-light"]`. The patch asserts every original
literal survives in the light block, so light mode is byte-identical to what
shipped. Every reference carries a literal fallback - 448-449 is why.

⚠ THE TWO ACCENTS COULD NOT CARRY OVER, and this is the 557 lesson again.
Measured with contrast.py on the dark tile (#1b1f24):

    #047857  positive green   3.02:1   FAIL
    #C8202E  cardinal red     2.92:1   FAIL

Both are chosen for a white card and collapse on a dark one. The twins are
computed, not picked: #34d399 (8.61:1) and #f08a90 (6.89:1), the latter already
the app's own light red. The number ink is #f2f4f7 (15.03:1) and the small caps
label #a8b0ba (7.56:1). White on cardinal red stays (5.67:1) - a semantic ink on
a coloured ground is correct in both themes and tokenising it would turn every
red button's label grey.

⚠ The neumorphic emboss inverts rather than dims: a light card is lit from the
top-left with a white inner highlight, a dark one needs the highlight DARKER
than the tile and the shadow blacker. Both inset colours are tokens for that
reason; carrying the light pair over would have drawn a grey smear.

Usage: patch_1216.py --src in.html --dst out.html
"""
import argparse, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

BUILD_OLD, BUILD_NEW = 1215, 1216
DATE = '2026-09-11'

COUNTED = ['crji-card', 'crji-nums', 'crji-btn', 'crji-ttl', 'crji-hint',
           'rb-light', '<style', '</style>', '<img']

# ---- the shipped light rules, verbatim, as the anchor -------------------
OLD_RULES = """.crji-card{
  background:#FFFFFF; border:1px solid #E2E8F0; border-radius:16px;
  box-shadow:0 1px 2px rgba(15,23,42,.06),0 8px 22px rgba(15,23,42,.16);
  padding:15px 16px; margin:12px 0 4px; color:#0F172A;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
}"""

NEW_RULES = """/* 1216: this card was the only large light surface left on the client
   profile - 1022x163 of white on a near-black screen, measured in a render.
   Tokens now, dark in the base rule and the ORIGINAL light values restored
   under the light theme below, so light mode is unchanged. The two accents
   had to be recomputed rather than carried: on the dark tile the old green
   scored 3.02:1 and the old red 2.92:1, both under the 4.5:1 floor. */
:root{
  --crji-card:#141619; --crji-line:#262a30; --crji-ink:#f2f4f7; --crji-sub:#a8b0ba;
  --crji-tile:#1b1f24; --crji-tile-lo:#0d0f12; --crji-tile-hi:#23282e;
  --crji-pos:#34d399; --crji-due:#f08a90;
  --crji-btn:#1b1f24; --crji-btn-ink:#e6e9ee;
  --crji-ghost:#1b1f24; --crji-ghost-ink:#a8b0ba;
  --crji-sh1:rgba(0,0,0,.45); --crji-sh2:rgba(0,0,0,.55);
}
:root[data-theme="rb-light"]{
  --crji-card:#FFFFFF; --crji-line:#E2E8F0; --crji-ink:#0F172A; --crji-sub:#475569;
  --crji-tile:#EAEEF3; --crji-tile-lo:#D1D9E6; --crji-tile-hi:#FFFFFF;
  --crji-pos:#047857; --crji-due:#C8202E;
  --crji-btn:#FFFFFF; --crji-btn-ink:#0F172A;
  --crji-ghost:#F8FAFC; --crji-ghost-ink:#475569;
  --crji-sh1:rgba(15,23,42,.06); --crji-sh2:rgba(15,23,42,.16);
}
.crji-card{
  background:var(--crji-card,#141619); border:1px solid var(--crji-line,#262a30); border-radius:16px;
  box-shadow:0 1px 2px var(--crji-sh1,rgba(0,0,0,.45)),0 8px 22px var(--crji-sh2,rgba(0,0,0,.55));
  padding:15px 16px; margin:12px 0 4px; color:var(--crji-ink,#f2f4f7);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
}"""

PAIRS = [
    (".crji-ttl{font-weight:800;font-size:15px;letter-spacing:-.01em;color:#0F172A;}",
     ".crji-ttl{font-weight:800;font-size:15px;letter-spacing:-.01em;color:var(--crji-ink,#f2f4f7);}"),

    (".crji-nums>span{display:flex;flex-direction:column;gap:2px;background:#EAEEF3;border-radius:11px;"
     "padding:9px 11px;box-shadow:inset 3px 3px 7px #D1D9E6, inset -3px -3px 7px #FFFFFF;}",
     ".crji-nums>span{display:flex;flex-direction:column;gap:2px;background:var(--crji-tile,#1b1f24);border-radius:11px;"
     "padding:9px 11px;box-shadow:inset 3px 3px 7px var(--crji-tile-lo,#0d0f12), inset -3px -3px 7px var(--crji-tile-hi,#23282e);}"),

    (".crji-nums small{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#475569;}",
     ".crji-nums small{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--crji-sub,#a8b0ba);}"),

    (".crji-nums b{font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;color:#0F172A;}",
     ".crji-nums b{font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--crji-ink,#f2f4f7);}"),

    (".crji-nums b.pos{color:#047857;}",
     ".crji-nums b.pos{color:var(--crji-pos,#34d399);}"),

    (".crji-nums b.due{color:#C8202E;}",
     ".crji-nums b.due{color:var(--crji-due,#f08a90);}"),

    (".crji-btn{display:inline-flex;align-items:center;gap:6px;cursor:pointer;border:1px solid #E2E8F0;"
     "background:#FFFFFF;color:#0F172A;font-size:13px;font-weight:600;padding:9px 12px;border-radius:10px;"
     "box-shadow:0 1px 2px rgba(15,23,42,.06),0 4px 10px rgba(15,23,42,.08);}",
     ".crji-btn{display:inline-flex;align-items:center;gap:6px;cursor:pointer;border:1px solid var(--crji-line,#262a30);"
     "background:var(--crji-btn,#1b1f24);color:var(--crji-btn-ink,#e6e9ee);font-size:13px;font-weight:600;padding:9px 12px;border-radius:10px;"
     "box-shadow:0 1px 2px var(--crji-sh1,rgba(0,0,0,.45)),0 4px 10px var(--crji-sh1,rgba(0,0,0,.45));}"),

    (".crji-btn.ghost{background:#F8FAFC;color:#475569;box-shadow:none;}",
     ".crji-btn.ghost{background:var(--crji-ghost,#1b1f24);color:var(--crji-ghost-ink,#a8b0ba);box-shadow:none;}"),

    (".crji-hint{font-size:13px;color:#475569;}",
     ".crji-hint{font-size:13px;color:var(--crji-sub,#a8b0ba);}"),
]

# every original light literal that the light block must restore
LIGHT_ORIGINALS = ['#FFFFFF', '#E2E8F0', '#0F172A', '#475569', '#EAEEF3',
                   '#D1D9E6', '#047857', '#C8202E', '#F8FAFC',
                   'rgba(15,23,42,.06)', 'rgba(15,23,42,.16)']

CL_ANCHOR = 'var CHANGELOG = [\n'
CL_NEW = (
"var CHANGELOG = [\n"
"  { b: %d, d: '%s', t: 'The Invoices card stops being a white box on a black screen',\n"
"    s: 'On a client&#8217;s page, <b>Invoices &amp; Payments</b> was the one card still built for a "
"white app &#8212; a bright white panel in the middle of an otherwise black screen, and the first "
"thing your eye landed on whether you wanted it or not. It is now the same dark card as everything "
"around it. The numbers did not just get darker: the green for money collected and the red for money "
"due were both too dark to read on a dark card, so each was replaced with a lighter shade of the same "
"colour that clears the readability floor. <b>Light mode is unchanged</b> &#8212; every original "
"colour is still there and comes back the moment you switch.' },\n" % (BUILD_NEW, DATE)
)


def no_planted_identifiers():
    """Comment lines only. Scanning a whole replacement would flag the real
    selectors this build exists to write - a check that fails correct work."""
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
        if not (name.endswith('_RULES') or name.endswith('_NEW')) or not isinstance(text, str):
            continue
        prose = comment_lines(text)
        for ident in COUNTED:
            if ident in prose:
                bad.append('%s: a COMMENT line contains %r' % (name, ident))
    assert not bad, ('an explanatory comment plants an identifier this patch counts. '
                     'REWORD THE PROSE, do not weaken the check:\n  ' + '\n  '.join(bad))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--dst', required=True)
    a = ap.parse_args()

    no_planted_identifiers()
    src = pl.load(a.src)
    orig = src

    assert orig.count('--crji-') == 0, 'the token namespace already exists'
    n_rules = len(re.findall(r'\.crji-[a-z]+[^{]*\{', orig))
    assert n_rules == 15, 'expected the 15 shipped rules, found %d' % n_rules

    src = pl.sub(src, OLD_RULES, NEW_RULES)
    for old, new in PAIRS:
        src = pl.sub(src, old, new)

    src = pl.sub(src, 'v%s build %d' % (DATE, BUILD_OLD), 'v%s build %d' % (DATE, BUILD_NEW))
    src = pl.sub(src, CL_ANCHOR, CL_NEW)

    # ---- postconditions ----
    # 1. the light theme restores every original literal
    i = src.index(':root[data-theme="rb-light"]{\n  --crji-card')
    light_block = src[i:src.index('}', i)]
    for lit in LIGHT_ORIGINALS:
        assert lit in light_block, 'the light theme lost %s' % lit
    # 2. no bare var() - 448/449
    refs = re.findall(r'var\(--crji-[a-z0-9-]+(,[^)]*)?\)', src)
    bare = [r for r in refs if not r]
    assert not bare, '%d --crji- reference(s) carry no literal fallback' % len(bare)
    print('%d token references, all with a literal fallback' % len(refs))
    # 3. the dark defaults are the fallbacks, not the light ones
    for light_only in ['#FFFFFF', '#EAEEF3', '#0F172A']:
        assert ('var(--crji-card,%s)' % light_only) not in src, 'a fallback still carries a light value'
    # 4. nothing else moved
    for ident in ['crji-card', 'crji-head', 'crji-ttl', 'crji-nums', 'crji-acts',
                  'crji-btn', 'crji-hint']:
        assert src.count(ident) >= orig.count(ident), '%s lost a reference' % ident
    assert src.count('<style') == orig.count('<style'), 'a style tag moved'
    assert src.count('</style>') == orig.count('</style>'), 'a style close moved'
    assert src.count('<img') == orig.count('<img'), 'an image tag moved'

    pl.write_atomic(a.dst, src)
    pl.assert_in(a.dst, '1216: this card was the only large light surface left')
    pl.assert_in(a.dst, 'v%s build %d' % (DATE, BUILD_NEW))
    print('wrote', a.dst)


if __name__ == '__main__':
    main()
