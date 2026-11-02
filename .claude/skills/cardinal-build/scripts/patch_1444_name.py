#!/usr/bin/env python3
"""patch_1444_name.py <file> - build 1444: the insurance side is called Insurance.

Theo's pick for question C (2 Nov 2026): "Make it called insurance." The insurance
portal carried three names - "Cardinal Truth" on the Front Door, the menu, its own
hub heading and the quick-jump palette, "Insurance" in the header, and "Claims" on the
Clients directory. Every VISIBLE label now reads Insurance. Untouched on purpose:
ids, classes, data-nav keys and function names (cardinaltruth, showCardinalTruth,
#cardinalTruthView, .cr-cth, viewing-cardinal-truth), source comments, and the
What's New history, which records what each build said at the time. The "Claims"
pill that opens the claims LIST is a different thing and keeps its name.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1]
s = pl.load(P)


def one(src, a, b):
    n = src.count(a)
    assert n == 1, 'anchor count %d (want 1): %r' % (n, a[:140])
    return src.replace(a, b, 1)


E = [
    # the menu row (the door into the insurance portal from every other portal)
    ('<button class="navopt" data-nav="cardinaltruth" data-cri="shield lg">Cardinal Truth</button>',
     '<button class="navopt" data-nav="cardinaltruth" data-cri="shield lg">Insurance</button>'),
    # the hub itself
    ('aria-label="Cardinal Truth sections"', 'aria-label="Insurance sections"'),
    ('<h1 class="ins-h1">Cardinal Truth</h1>', '<h1 class="ins-h1">Insurance</h1>'),
    ('<p class="ins-lede">Every claim tells a story. Cardinal Truth is where the story gets straight',
     '<p class="ins-lede">Every claim tells a story. This is where the story gets straight'),
    ('id="icBackBtn" aria-label="Back to Cardinal Truth" title="Back to Cardinal Truth"',
     'id="icBackBtn" aria-label="Back to Insurance" title="Back to Insurance"'),
    ("    brand.title = 'Cardinal Truth';", "    brand.title = 'Insurance';"),
    ('<div class="cr-a-back" data-act="back">← Back to Cardinal Truth</div>',
     '<div class="cr-a-back" data-act="back">← Back to Insurance</div>'),
    # the Front Door / portal picker
    ("desc:'Storm and claim work \\u2014 carrier, adjuster, ACV and RCV, supplements. Cardinal Truth lives here.' },",
     "desc:'Storm and claim work \\u2014 carrier, adjuster, ACV and RCV, supplements.' },"),
    ("rowHtml('insurance', '#d9282a', 'Cardinal Truth',", "rowHtml('insurance', '#d9282a', 'Insurance',"),
    # the quick-jump palette
    ("label:'Cardinal Truth',    section:'Views',", "label:'Insurance',         section:'Views',"),
    # Self Check's own wording
    ("fix    : 'Either open the claim (Cardinal Truth \\u2192 New Claim) or ' +",
     "fix    : 'Either open the claim (Insurance \\u2192 New Claim) or ' +"),
    ("['#cr-fd [data-fd=\"insurance\"]',  'Cardinal Truth portal'],",
     "['#cr-fd [data-fd=\"insurance\"]',  'Insurance portal'],"),
    ("{ name:'Cardinal Claims', open:function(){\nif(typeof window.showCardinalTruth === 'function') window.showCardinalTruth();",
     "{ name:'Insurance', open:function(){\nif(typeof window.showCardinalTruth === 'function') window.showCardinalTruth();"),
    # the Clients directory portal label (chips, columns, filter rail, section heads)
    ("  { key:'insurance', label:'Claims',    color:'#2dd4bf', colorLight:'#0f766e' },",
     "  { key:'insurance', label:'Insurance', color:'#2dd4bf', colorLight:'#0f766e' },"),
    # the retired landing's portal list and the old landing card (still in the markup)
    ("'<span class=\"tt\"><span class=\"wm-c\">Cardinal</span> <span class=\"wm-t\">Truth</span></span>' +",
     "'<span class=\"tt\">Insurance</span>' +"),
    ('        Cardinal Truth &#8212; the claims playbook, supplements, adjuster notes, and code cites.</div>',
     '        The claims playbook, supplements, adjuster notes, and code cites.</div>'),
]
for a, b in E:
    s = one(s, a, b)
pl.write_atomic(P, s)
print('patch_1444_name: %d edits applied to %s' % (len(E), P))
