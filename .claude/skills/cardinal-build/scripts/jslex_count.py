#!/usr/bin/env python3
"""Count occurrences in JS with strings/templates/comments as lexer states.

Why this exists (CLAUDE.md "Counting things in this file"): most wrong claims
on this project came from a count. Counting the global scroll lock three ways:

    bare regex ............... 14 modules  (one was text inside a comment)
    strip /* ... */ first .... 10 modules  (ate real calls from three modules)
    JS lexer ................. 13 modules  CORRECT

Both shortcuts were wrong, in opposite directions. `/*` inside a string literal
is not a comment, so naive comment-stripping deletes real code.

Usage:
    # count in real code only, per inline <script> block
    python3 jslex_count.py index.html 'document.body.style.overflow'

    # include matches inside strings (e.g. counting a selector used via querySelector)
    python3 jslex_count.py index.html '.menu-footer' --in-strings

    # show where each hit is
    python3 jslex_count.py index.html 'normStage' --show

    # regex instead of literal
    python3 jslex_count.py index.html 'body\\.style\\.overflow\\s*=\\s*.{0,12}' --regex

Reports counts in CODE, in STRINGS, and in COMMENTS separately, plus how many
distinct inline script blocks ("modules") contain a code hit.
"""

import argparse
import re
import sys

CODE, SQ, DQ, TPL, LINE, BLOCK, REGEX = range(7)


def lex_spans(js):
    """Return list of (start, end, state) spans classifying every char of js.

    Handles: '...' "..." `...${ nested }...` // ... /* ... */ and /regex/.
    Regex-vs-divide is disambiguated by the previous significant token.
    """
    spans = []
    i = 0
    n = len(js)
    state = CODE
    start = 0
    tpl_depth = []          # brace depth stack for ${ } inside templates
    prev_sig = ''           # last significant non-space code char

    def close(at, st):
        if at > start:
            spans.append((start, at, st))

    while i < n:
        c = js[i]
        nxt = js[i + 1] if i + 1 < n else ''
        if state == CODE:
            if c == "'":
                close(i, CODE); start = i; state = SQ
            elif c == '"':
                close(i, CODE); start = i; state = DQ
            elif c == '`':
                close(i, CODE); start = i; state = TPL
            elif c == '/' and nxt == '/':
                close(i, CODE); start = i; state = LINE
            elif c == '/' and nxt == '*':
                close(i, CODE); start = i; state = BLOCK
            elif c == '/' and prev_sig not in ')]}' and not (
                    prev_sig.isalnum() or prev_sig in '_$'):
                # regex literal position
                close(i, CODE); start = i; state = REGEX
            elif c == '}' and tpl_depth:
                if tpl_depth[-1] == 0:
                    tpl_depth.pop()
                    close(i, CODE); start = i; state = TPL
                else:
                    tpl_depth[-1] -= 1
            elif c == '{' and tpl_depth:
                tpl_depth[-1] += 1
            if not c.isspace():
                prev_sig = c
            i += 1
            continue
        if state in (SQ, DQ):
            q = "'" if state == SQ else '"'
            if c == '\\':
                i += 2; continue
            if c == q:
                close(i + 1, state); start = i + 1; state = CODE; prev_sig = q
            i += 1
            continue
        if state == TPL:
            if c == '\\':
                i += 2; continue
            if c == '$' and nxt == '{':
                close(i, TPL); tpl_depth.append(0); start = i; state = CODE
                i += 2; continue
            if c == '`':
                close(i + 1, TPL); start = i + 1; state = CODE; prev_sig = '`'
            i += 1
            continue
        if state == LINE:
            if c == '\n':
                close(i, LINE); start = i; state = CODE
            i += 1
            continue
        if state == BLOCK:
            if c == '*' and nxt == '/':
                close(i + 2, BLOCK); start = i + 2; state = CODE
                i += 2; continue
            i += 1
            continue
        if state == REGEX:
            if c == '\\':
                i += 2; continue
            if c == '[':
                j = js.find(']', i)
                i = j + 1 if j > -1 else i + 1
                continue
            if c == '/':
                close(i + 1, REGEX); start = i + 1; state = CODE; prev_sig = '/'
            elif c == '\n':
                close(i, REGEX); start = i; state = CODE
            i += 1
            continue
    close(n, state)
    return spans


def classify(js, pos, spans):
    for s, e, st in spans:
        if s <= pos < e:
            return st
    return CODE


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("needle")
    ap.add_argument("--regex", action="store_true")
    ap.add_argument("--in-strings", action="store_true",
                    help="count string hits toward the module tally too")
    ap.add_argument("--show", action="store_true", help="print each hit")
    args = ap.parse_args()

    src = open(args.file, encoding="utf-8").read()
    pat = re.compile(args.needle if args.regex else re.escape(args.needle))

    blocks = [m for m in re.finditer(r"<script\b([^>]*)>(.*?)</script\s*>",
                                     src, re.I | re.S)
              if not re.search(r"\bsrc\s*=", m.group(1), re.I) and m.group(2).strip()]

    tot = {CODE: 0, SQ: 0, DQ: 0, TPL: 0, LINE: 0, BLOCK: 0, REGEX: 0}
    mods_code, mods_str = set(), set()

    for bi, m in enumerate(blocks):
        js = m.group(2)
        base = m.start(2)
        spans = lex_spans(js)
        for hit in pat.finditer(js):
            st = classify(js, hit.start(), spans)
            tot[st] += 1
            if st == CODE:
                mods_code.add(bi)
            elif st in (SQ, DQ, TPL):
                mods_str.add(bi)
            if args.show:
                name = {CODE: "code", SQ: "string", DQ: "string", TPL: "template",
                        LINE: "comment", BLOCK: "comment", REGEX: "regex"}[st]
                line = src.count("\n", 0, base + hit.start()) + 1
                ctx = js[max(0, hit.start() - 50):hit.start() + 60].replace("\n", " ")
                print(f"  block {bi:>3} line {line:>6} [{name:>8}]  ...{ctx}...")

    strings = tot[SQ] + tot[DQ] + tot[TPL]
    comments = tot[LINE] + tot[BLOCK]
    print(f"\n{args.needle!r} across {len(blocks)} inline script blocks:")
    print(f"  in CODE      : {tot[CODE]}")
    print(f"  in strings   : {strings}")
    print(f"  in comments  : {comments}   <-- a bare regex would count these")
    print(f"  in regex lits: {tot[REGEX]}")
    counted = mods_code | mods_str if args.in_strings else mods_code
    print(f"\n  distinct blocks with a {'code-or-string' if args.in_strings else 'CODE'} hit: "
          f"{len(counted)}")
    naive = len(pat.findall(src))
    print(f"  (bare regex over the whole file would say: {naive})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
