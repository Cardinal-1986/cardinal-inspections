"""csswalk.py — find the document-level <style> blocks of index.html (skipping every
<script>, whose template strings carry print stylesheets of their own) and walk their
rules with a comment/string-aware brace parser. Yields Rule(block_id, media, selector,
body, abs_start, abs_end)."""
import re
from collections import namedtuple

Rule = namedtuple('Rule', 'block media selector body start end')


def style_blocks(src):
    i = 0
    out = []
    low = src  # tags in this file are lowercase
    while True:
        a = low.find('<s', i)
        if a == -1:
            break
        if low.startswith('<script', a):
            gt = low.find('>', a)
            end = low.find('</script>', gt)
            i = end + 9
            continue
        if low.startswith('<style', a):
            gt = low.find('>', a)
            tag = src[a:gt + 1]
            m = re.search(r'id="([^"]+)"', tag)
            end = low.find('</style>', gt)
            out.append((m.group(1) if m else None, gt + 1, end))
            i = end + 8
            continue
        i = a + 2
    return out


def _skip_comment_or_string(css, i):
    if css.startswith('/*', i):
        j = css.find('*/', i + 2)
        return (len(css) if j == -1 else j + 2)
    ch = css[i]
    if ch in '"\'':
        j = i + 1
        while j < len(css):
            if css[j] == '\\':
                j += 2
                continue
            if css[j] == ch:
                return j + 1
            j += 1
        return j
    return None


def walk(css, offset=0, block=None, media=()):
    i = 0
    n = len(css)
    while i < n:
        # find next '{' or '}' at this level, tracking the prelude start
        pre_start = i
        while i < n:
            s = _skip_comment_or_string(css, i)
            if s is not None:
                i = s
                continue
            if css[i] in '{}':
                break
            if css[i] == ';' :  # stray @import / @charset etc
                i += 1
                pre_start = i
                continue
            i += 1
        if i >= n or css[i] == '}':
            return
        prelude = css[pre_start:i]
        # find the matching close brace
        j = i + 1
        depth = 1
        while j < n and depth:
            s = _skip_comment_or_string(css, j)
            if s is not None:
                j = s
                continue
            if css[j] == '{':
                depth += 1
            elif css[j] == '}':
                depth -= 1
            j += 1
        body = css[i + 1:j - 1]
        sel = re.sub(r'/\*.*?\*/', '', prelude, flags=re.S).strip()
        if sel.startswith('@'):
            if re.match(r'@(media|supports|layer|container)\b', sel):
                yield from walk(body, offset + i + 1, block, media + (sel,))
            # @keyframes / @font-face: not style rules
        else:
            yield Rule(block, media, sel, body, offset + pre_start, offset + j)
        i = j


def rules(src):
    for bid, a, b in style_blocks(src):
        yield from walk(src[a:b], a, bid)
