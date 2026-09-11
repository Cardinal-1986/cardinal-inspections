#!/usr/bin/env python3
"""Build 1217 - the estimate builder: dark chrome, paper document. Theo's pick (b).

The other half of item 1. `cr-est-view` was 1152x873 of white inside a dark app -
the largest light surface in the CRM. Two treatments were rendered and put to
him; he took (b): the FRAME goes dark and joins the app, the ESTIMATE ITSELF
stays the colour it prints on. It is a document, and it is edited on a desk.

⚠ THIS IS NOT AN 87-SITE CONVERSION, AND FINDING THAT OUT IS THE BUILD. A sweep
of the stylesheet counts 87 light values across 17 names and reads like a rewrite.
Rendering it and MEASURING what actually breaks when the ground flips gives
thirteen failing text nodes from exactly THREE inks:

    #475569  labels and section heads   2.57:1   x8
    #C8202E  the + Custom outline       3.43:1
    #2F7D4A  the + ABC Supply outline   3.85:1

Everything else in that count is inside a document block and never sees the dark
ground at all. Measure the render, not the stylesheet.

THE MECHANISM IS THE MODULE'S OWN. It already carries an `--est-*` family (12
names, 148 references) which IS the paper palette. A second family beside it
would be the bug-with-a-delay this project keeps recording, so instead there is a
`--estc-*` CHROME layer scoped to `#cr-est-view`, themed by the app theme, and
only the rules that sit ON the ground are repointed at it. `--est-*` is untouched,
so every document block is byte-identical by construction.

⚠ ONE RULE HAD TO BE SPLIT, and it is the trap in this build. A single selector
list paints `--est-dim` onto EIGHT things - and two of them (the field labels and
the Line Items heading) sit on the chrome ground while the other six sit inside
paper cards. They need opposite inks. Left whole, either the labels stay 2.57:1
on black or the card text goes pale-on-cream; the patch asserts both halves
survive with the right token.

Light mode is byte-identical: the light twin restores #fdfcf7, #F4F4F5, #475569,
#FFFFFF, #F1F5F9, #E2E8F0, #8f1620 and #2a6b3c exactly.

Usage: patch_1217.py --src in.html --dst out.html
"""
import argparse, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

BUILD_OLD, BUILD_NEW = 1216, 1217
DATE = '2026-09-11'
COUNTED = ['cr-est-view', 'cr-est-body', 'cr-est-nav', 'navitem', 'navsec',
           'add-custom', 'add-abc', 'add-section', 'est-dim', 'estc-',
           '<style', '</style>', '<img']

TOKENS = """/* 1217: the CHROME layer. Theo's pick (b) off the design read - the frame goes
   dark and joins the app, the estimate itself stays the colour it prints on.
   Scoped to the view so nothing outside it can inherit, and themed by the app
   theme so the light twin restores exactly what shipped. The paper palette
   beside it is untouched: every document block is unchanged by construction. */
#cr-est-view{
  --estc-viewbg:#0c0d0f; --estc-bg:#0c0d0f; --estc-ink:#e9ecf1; --estc-dim:#a8b0ba;
  --estc-red:#f08a90; --estc-green:#34d399;
  --estc-panel:#141619; --estc-well:#1b1f24; --estc-line:#262a30;
  --estc-on:rgba(200,32,46,.16); --estc-cnt:#23282e;
  --estc-lift:0 10px 30px rgba(0,0,0,.55);
}
:root[data-theme="rb-light"] #cr-est-view{
  --estc-viewbg:#fdfcf7; --estc-bg:#F4F4F5; --estc-ink:#2c2c2c; --estc-dim:#475569;
  --estc-red:#8f1620; --estc-green:#2a6b3c;
  --estc-panel:#FFFFFF; --estc-well:#F1F5F9; --estc-line:#E2E8F0;
  --estc-on:#FDECEE; --estc-cnt:#E2E8F0;
  --estc-lift:0 1px 2px rgba(15,23,42,.06),0 6px 16px rgba(15,23,42,.09);
}
"""

VIEW_OLD = ("#cr-est-view{display:none;position:fixed;inset:0;background:#fdfcf7;color:#2c2c2c;"
            "z-index:9500;flex-direction:column;"
            "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}")
VIEW_NEW = (TOKENS +
            "#cr-est-view{display:none;position:fixed;inset:0;"
            "background:var(--estc-viewbg,#0c0d0f);color:var(--estc-ink,#e9ecf1);"
            "z-index:9500;flex-direction:column;"
            "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}")

PAIRS = [
    # ---- the view and body grounds ----
    # ⚠ THE VIEW'S OWN GROUND IS SET TWICE AND THE LATER BLOCK WINS. Repointing
    # only the first one is a silent no-op — measured: the view still computed
    # rgb(244,244,245) after the edit, and every ink in the dark top bar then
    # scored against a near-white page (1.04:1) because the bar paints a
    # gradient and an ancestor walk cannot see through it. One missed winner
    # produced seven downstream failures that looked like seven separate bugs.
    ("#cr-est-view{background:var(--est-bg);color:var(--est-ink);}",
     "#cr-est-view{background:var(--estc-viewbg,#0c0d0f);color:var(--estc-ink,#e9ecf1);}"),
    ("#cr-est-view .cr-est-body{background:var(--est-bg);}",
     "#cr-est-view .cr-est-body{background:var(--estc-bg,#0c0d0f);}"),

    # ---- THE SPLIT: two of these eight sit on the chrome ground ----
    ("""
#cr-est-view .cr-est-clientcard .addr,
#cr-est-view .cr-est-body label,
#cr-est-view .cr-est-items-head h3,
#cr-est-view .cr-est-lineitem .pricing.lump .lump-lbl,
#cr-est-view .cr-est-lineitem .pricing .lbl,
#cr-est-view .cr-est-totals .lbl,
#cr-est-view .cr-est-photohint,
#cr-est-view .cr-est-saved-list .head{color:var(--est-dim);}""",
     """
/* 1217 SPLIT THIS RULE, and the reason is the whole shape of the build: the
   first two sit ON the chrome ground and the rest sit INSIDE paper cards, so
   they need opposite inks. Whole, one half or the other is unreadable - the
   labels at 2.57:1 on black, or the card text pale on cream. */
#cr-est-view .cr-est-body label,
#cr-est-view .cr-est-items-head h3{color:var(--estc-dim,#a8b0ba);}
#cr-est-view .cr-est-clientcard .addr,
#cr-est-view .cr-est-lineitem .pricing.lump .lump-lbl,
#cr-est-view .cr-est-lineitem .pricing .lbl,
#cr-est-view .cr-est-totals .lbl,
#cr-est-view .cr-est-photohint,
#cr-est-view .cr-est-saved-list .head{color:var(--est-dim);}"""),

    # ---- the three outline buttons that sit on the ground ----
    (".cr-est-items-head .add-custom{background:transparent;color:#8f1620;border:1px solid #c8202e}",
     ".cr-est-items-head .add-custom{background:transparent;color:var(--estc-red,#f08a90);"
     "border:1px solid var(--estc-red,#f08a90)}"),
    (".cr-est-items-head .add-abc{background:transparent;color:#2a6b3c;border:1px solid #2a6b3c;margin-left:6px}",
     ".cr-est-items-head .add-abc{background:transparent;color:var(--estc-green,#34d399);"
     "border:1px solid var(--estc-green,#34d399);margin-left:6px}"),
    (".cr-est-items-head .add-section{background:transparent;color:var(--est-dim,#475569);"
     "border:1px solid var(--est-line,#e2e8f0)}",
     ".cr-est-items-head .add-section{background:transparent;color:var(--estc-dim,#a8b0ba);"
     "border:1px solid var(--estc-line,#262a30)}"),
    (".cr-est-items-head .add-section:hover{background:var(--est-well,#f8fafc)}",
     ".cr-est-items-head .add-section:hover{background:var(--estc-well,#1b1f24)}"),

    # ⚠ THE TWO RULES ABOVE WERE A SILENT NO-OP ON THEIR OWN, and the render is
    # what said so: after patching them the sweep still measured rgb(200,32,46)
    # and rgb(47,125,74) — values neither rule contains. A later block
    # out-specifies both with an id-prefixed selector, so the edits parsed,
    # balanced and never applied. That is build 481's class exactly, and
    # selector_audit.py names it in one line: "patching those alone is a silent
    # no-op". Deletion at source beats out-specificity, so the WINNERS are what
    # move; the losers above are kept consistent rather than left contradicting.
    ("#cr-est-view .cr-est-items-head .add-custom{color:var(--est-red);border:1px solid var(--est-red);}",
     "#cr-est-view .cr-est-items-head .add-custom{color:var(--estc-red,#f08a90);border:1px solid var(--estc-red,#f08a90);}"),
    ("#cr-est-view .cr-est-items-head .add-abc{color:#2F7D4A;border:1px solid #3F9457;}",
     "#cr-est-view .cr-est-items-head .add-abc{color:var(--estc-green,#34d399);border:1px solid var(--estc-green,#34d399);}"),

    # ---- the navigator rail: chrome, not porcelain ----
    ("""    background:#FFFFFF;
    border:1px solid var(--est-line);
    border-radius:12px;
    box-shadow:var(--est-lift);""",
     """    background:var(--estc-panel,#141619);
    border:1px solid var(--estc-line,#262a30);
    border-radius:12px;
    box-shadow:var(--estc-lift,0 10px 30px rgba(0,0,0,.55));"""),

    ("""#cr-est-view .cr-est-nav .navsec{
  display:flex;align-items:center;gap:7px;width:100%;
  background:#F1F5F9;box-shadow:none;
  color:#475569;border:1px solid var(--est-line);border-radius:7px;""",
     """#cr-est-view .cr-est-nav .navsec{
  display:flex;align-items:center;gap:7px;width:100%;
  background:var(--estc-well,#1b1f24);box-shadow:none;
  color:var(--estc-dim,#a8b0ba);border:1px solid var(--estc-line,#262a30);border-radius:7px;"""),

    ("""#cr-est-view .cr-est-nav .navitem{
  display:flex;align-items:baseline;gap:8px;width:100%;
  background:transparent;border:0;border-radius:6px;
  color:#475569;font:600 12px 'Segoe UI',Arial,sans-serif;""",
     """#cr-est-view .cr-est-nav .navitem{
  display:flex;align-items:baseline;gap:8px;width:100%;
  background:transparent;border:0;border-radius:6px;
  color:var(--estc-dim,#a8b0ba);font:600 12px 'Segoe UI',Arial,sans-serif;"""),

    ("#cr-est-view .cr-est-nav .navhead{\n"
     "  font:800 11px ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;\n"
     "  color:var(--est-dim);padding:0 6px 8px;\n}",
     "#cr-est-view .cr-est-nav .navhead{\n"
     "  font:800 11px ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;\n"
     "  color:var(--estc-dim,#a8b0ba);padding:0 6px 8px;\n}"),

    ("#cr-est-view .cr-est-nav .navsec .cnt{\n"
     "  font:700 11px ui-monospace,Menlo,monospace;color:var(--est-dim);\n"
     "  background:#E2E8F0;border-radius:999px;padding:1px 7px;\n}",
     "#cr-est-view .cr-est-nav .navsec .cnt{\n"
     "  font:700 11px ui-monospace,Menlo,monospace;color:var(--estc-dim,#a8b0ba);\n"
     "  background:var(--estc-cnt,#23282e);border-radius:999px;padding:1px 7px;\n}"),

    ("#cr-est-view .cr-est-nav .navitem:hover{background:#F1F5F9;color:var(--est-ink);}",
     "#cr-est-view .cr-est-nav .navitem:hover{background:var(--estc-well,#1b1f24);color:var(--estc-ink,#e9ecf1);}"),

    ("""#cr-est-view .cr-est-nav .navitem.on{
  background:#FDECEE;color:var(--est-ink);font-weight:700;
  box-shadow:inset 3px 0 0 var(--est-red), 0 1px 2px rgba(15,23,42,.06);
}""",
     """#cr-est-view .cr-est-nav .navitem.on{
  background:var(--estc-on,rgba(200,32,46,.16));color:var(--estc-ink,#e9ecf1);font-weight:700;
  box-shadow:inset 3px 0 0 var(--est-red), 0 1px 2px rgba(15,23,42,.06);
}"""),

    ("#cr-est-view .cr-est-nav .navitem .ix{\n"
     "  flex:0 0 auto;font:700 11px ui-monospace,Menlo,monospace;color:#94A3B8;min-width:14px;\n}",
     "/* 1217: this was 2.56:1 on the porcelain rail before the ground moved - a\n"
     "   failure the flip did not cause and does not get to keep. */\n"
     "#cr-est-view .cr-est-nav .navitem .ix{\n"
     "  flex:0 0 auto;font:700 11px ui-monospace,Menlo,monospace;color:var(--estc-dim,#a8b0ba);min-width:14px;\n}"),

    ("#cr-est-view .cr-est-nav .navempty{color:var(--est-dim);font:600 11px 'Segoe UI',Arial,sans-serif;"
     "padding:6px 10px;line-height:1.4;}",
     "#cr-est-view .cr-est-nav .navempty{color:var(--estc-dim,#a8b0ba);font:600 11px 'Segoe UI',Arial,sans-serif;"
     "padding:6px 10px;line-height:1.4;}"),
]

# the paper blocks lift off the dark ground — what makes (b) read as a document
LIFTS = [
    (".cr-est-clientcard{", "background:#f4f2f1"),
    (".cr-est-empty-items{", "background:#f4f2f1"),
    (".cr-est-totals{", "background:#f4f2f1"),
]

LIGHT_ORIGINALS = ['#fdfcf7', '#F4F4F5', '#2c2c2c', '#475569', '#8f1620', '#2a6b3c',
                   '#FFFFFF', '#F1F5F9', '#E2E8F0', '#FDECEE']

CL_ANCHOR = 'var CHANGELOG = [\n'
CL_NEW = (
"var CHANGELOG = [\n"
"  { b: %d, d: '%s', t: 'The estimate builder: a dark desk, and the estimate still looks like paper',\n"
"    s: 'Building an estimate used to fill the whole screen with white while the rest of Cardinal "
"stayed black &#8212; two apps in one window, and rough on the eyes at night or on a roof. The frame "
"around the estimate is now dark like everything else: the jump list down the left, the headings, the "
"page behind it. <b>The estimate itself is still on paper.</b> The client block, the line items, the "
"totals and the notes stay cream and now sit up off the dark page like a document on a desk, because "
"that is what they are &#8212; it is what prints and what the customer sees. Every label and button "
"around them was re-inked to stay readable on the darker page. <b>Light mode is unchanged.</b>' },\n"
% (BUILD_NEW, DATE))


def no_planted_identifiers():
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
        if not isinstance(text, str) or not (name.endswith('_NEW') or name == 'TOKENS'):
            continue
        prose = comment_lines(text)
        for ident in COUNTED:
            if ident in prose:
                bad.append('%s: a COMMENT line contains %r' % (name, ident))
    assert not bad, ('a comment plants an identifier this patch counts. REWORD THE PROSE, '
                     'do not weaken the check:\n  ' + '\n  '.join(bad))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--dst', required=True)
    a = ap.parse_args()

    no_planted_identifiers()
    src = pl.load(a.src)
    orig = src

    assert orig.count('--estc-') == 0, 'the chrome layer already exists'
    est_refs_before = len(re.findall(r'var\(\s*--est-[a-z0-9-]+', orig))

    src = pl.sub(src, VIEW_OLD, VIEW_NEW)
    for old, new in PAIRS:
        src = pl.sub(src, old, new)

    # the paper blocks lift off the dark ground
    for anchor, bg in LIFTS:
        i = src.index(anchor)
        j = src.index('}', i)
        rule = src[i:j]
        assert 'box-shadow' not in rule, '%s already carries a shadow' % anchor
        src = src[:j] + ';box-shadow:var(--estc-lift,0 10px 30px rgba(0,0,0,.55))' + src[j:]

    src = pl.sub(src, 'v%s build %d' % (DATE, BUILD_OLD), 'v%s build %d' % (DATE, BUILD_NEW))
    src = pl.sub(src, CL_ANCHOR, CL_NEW)

    # ---- postconditions ----
    i = src.index(':root[data-theme="rb-light"] #cr-est-view{')
    light = src[i:src.index('}', i)]
    for lit in LIGHT_ORIGINALS:
        assert lit in light, 'the light twin lost %s' % lit

    # THE SPLIT survived with the right token on each half
    assert '#cr-est-view .cr-est-body label,\n#cr-est-view .cr-est-items-head h3{color:var(--estc-dim,#a8b0ba);}' in src, \
        'the chrome half of the split rule is wrong'
    assert '#cr-est-view .cr-est-photohint,\n#cr-est-view .cr-est-saved-list .head{color:var(--est-dim);}' in src, \
        'the paper half of the split rule is wrong'

    # the paper palette is untouched
    est_refs_after = len(re.findall(r'var\(\s*--est-[a-z0-9-]+', src))
    moved = est_refs_before - est_refs_after
    # ⚠ SELF-COMPUTING, not a typed number. The first version hardcoded a bound
    # and failed the moment two more rules legitimately moved — a hardcoded
    # count is read off an already-patched tree and goes stale on the next
    # correct edit. The expectation is derived from the edits themselves.
    pat = re.compile(r'var\(\s*--est-[a-z0-9-]+')
    expect = sum(len(pat.findall(o)) - len(pat.findall(n)) for o, n in [(VIEW_OLD, VIEW_NEW)] + PAIRS)
    print('paper-palette references %d -> %d (%d repointed, %d expected from the edits)'
          % (est_refs_before, est_refs_after, moved, expect))
    assert moved == expect, 'repointed %d paper references, the edits account for %d' % (moved, expect)

    # every chrome reference carries a literal fallback
    bare = re.findall(r'var\(\s*--estc-[a-z0-9-]+\s*\)', src)
    assert not bare, '%d chrome reference(s) carry no literal fallback' % len(bare)
    print('%d chrome references, all with a literal fallback'
          % len(re.findall(r'var\(\s*--estc-[a-z0-9-]+', src)))

    # The three failing inks are gone from the rules that sit ON the ground.
    # ⚠ SCOPED TO THE RULE, NOT A SPAN. The first version sliced from one
    # selector to another and caught #8f1620 in a DIFFERENT rule inside that
    # span — the file-wide-assertion trap this project keeps paying for, in
    # miniature. Assert the rule text itself.
    for sel, dead, live in [('.cr-est-items-head .add-custom{', '#8f1620', '--estc-red'),
                            ('.cr-est-items-head .add-abc{',    '#2a6b3c', '--estc-green'),
                            ('.cr-est-items-head .add-section{', '#475569', '--estc-dim')]:
        i = src.index(sel); rule = src[i:src.index('}', i)]
        assert dead not in rule, '%s survived in %s' % (dead, sel)
        assert live in rule, '%s never reached %s' % (live, sel)
    # ⚠ AND THE WINNERS, which is where the colour actually comes from. Checking
    # the losers alone is what let the first run report success over a no-op.
    for sel, dead in [('#cr-est-view .cr-est-items-head .add-custom{', 'var(--est-red)'),
                      ('#cr-est-view .cr-est-items-head .add-abc{', '#2F7D4A')]:
        i = src.index(sel); rule = src[i:src.index('}', i)]
        assert dead not in rule, 'the WINNING rule for %s still carries %s' % (sel, dead)
        assert '--estc-' in rule, 'the winning rule for %s never reached the chrome layer' % sel

    assert src.count('<style') == orig.count('<style'), 'a style tag moved'
    assert src.count('</style>') == orig.count('</style>'), 'a style close moved'
    assert src.count('<img') == orig.count('<img'), 'an image tag moved'

    pl.write_atomic(a.dst, src)
    pl.assert_in(a.dst, '1217: the CHROME layer')
    pl.assert_in(a.dst, 'v%s build %d' % (DATE, BUILD_NEW))
    print('wrote', a.dst)


if __name__ == '__main__':
    main()
