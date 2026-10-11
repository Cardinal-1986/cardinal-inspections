"""gate_1312 static half: no string literal in the Community blocks says "bid".
Lexer-routed (jslex_count.lex_spans), so comments never count and strings always do.
Internal keys stay "bid" on purpose (rows and other modules read them); ALLOW lists them.
Usage: python3 gate_1312_static.py [index.html]   (prints JSON)"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jslex_count as JL
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
s = open(PATH, encoding='utf-8').read()
BLOCKS = ['cr-ch2-script', 'cr-cc-script', 'cr-nbid-script', 'cr-cpartners-script']
ALLOW = {'bids', 'bid', 'community-bid'}   # data-pane key, checklist.bid / tab key, source tag
WORD = re.compile(r'\b[Bb]id(s|ding)?\b')
hits, strings = [], 0
for b in BLOCKS:
    i = s.find('<script id="%s"' % b)
    if i < 0: hits.append({'block': b, 'missing': True}); continue
    i = s.index('>', i) + 1; j = s.index('</script>', i); js = s[i:j]
    for st, en, kind in JL.lex_spans(js):
        if kind not in (JL.SQ, JL.DQ, JL.TPL): continue
        strings += 1
        lit = js[st:en]; inner = lit[1:-1] if len(lit) > 1 else lit
        if inner in ALLOW: continue
        # attribute keys inside markup strings (data-pane="bids", data-act="newbid") are not words a person reads
        vis = re.sub(r'data-[a-z-]+="[^"]*"', '', inner)
        if WORD.search(vis): hits.append({'block': b, 'text': inner[:120]})
print(json.dumps({'strings': strings, 'hits': hits}))
