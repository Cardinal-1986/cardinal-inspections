#!/usr/bin/env python3
"""Emoji census for index.html — the instrument behind the "N remain" number.

Why this exists
---------------
The sweep's size has been misreported twice, in both directions, and each time
the cause was the counting method rather than the app:

  * "550 remain"  — the census never covered 0x2300-0x23FF (Miscellaneous
    Technical), so the whole Reminder row was invisible to it.  Real: 562.
  * "533 remain"  — could not be reproduced at build 691.  A naive three-form
    count says 957.  The gap is entirely EXCLUSIONS: comments, the CHANGELOG,
    and functional UI glyphs.  A number quoted without its exclusions is not a
    measurement.

So this script never prints one number.  It prints the buckets, and it names
what it excluded and why.

THREE ENCODINGS, and missing any one under-reports badly
--------------------------------------------------------
    literal      🔨              raw UTF-8 in markup or a string
    HTML entity  &#128296;       every .viewhead heading uses this form
    JS escape    \\uD83D\\uDD28    surrogate pair inside a JS string literal

A source grep for literal UTF-8 finds 91 of 957.

WHAT IS OUT OF SCOPE (Theo's decisions, not judgement calls)
------------------------------------------------------------
    comments        module banners are box-drawing and prose; not rendered
    cr-cl-script    the CHANGELOG keeps its emoji — historical record
    functional      checkbox/arrow/suit/hamburger glyphs are UI, not stickers

Anything this script cannot confidently place goes in REVIEW, never silently
into a bucket that flatters the total.

Usage
-----
    python3 emoji_census.py [index.html] [--blocks] [--char X] [--json]

    --blocks   per-block table, biggest first — this is how you pick a tranche
    --char X   show every site of one character, with its encoding and block
    --json     machine-readable, for a gate
"""

import argparse
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jslex_count import lex_spans, CODE, SQ, DQ, TPL, LINE, BLOCK, REGEX  # noqa: E402

# ---------------------------------------------------------------------------
# Scope
# ---------------------------------------------------------------------------

# Blocks whose emoji are deliberately kept.  Keyed by <script id=>.
SKIP_BLOCKS = {
    'cr-cl-script',      # the CHANGELOG — historical record, Theo settled it
}

# NEVER TOUCH.  Not emoji at all — legal marks on brand names.  A sweep that
# treats ® as a sticker strips the registered-trademark symbol off "Owens
# Corning®" and "Duration®", which OC_BRAND_RULES.md governs and which Cardinal
# is contractually required to carry.  46 of them at build 691.
BRAND = {
    0x00AE,                          # ® REGISTERED SIGN
    0x2122,                          # ™ TRADE MARK SIGN
    0x00A9,                          # © COPYRIGHT SIGN
}

# Functional UI glyphs: these carry MEANING at their position (a checkbox, a
# disclosure triangle, a sort affordance, the hamburger).  Replacing one with
# an SVG is a different build with a different argument, so they are counted
# apart rather than folded into the sweep total.
FUNCTIONAL = {
    0x2610, 0x2611, 0x2612,          # ☐ ☑ ☒ ballot boxes
    0x2713, 0x2714, 0x2715, 0x2716,  # ✓ ✔ ✕ ✖
    0x2717, 0x2718, 0x2719,          # ✗ ✘
    0x2705,                          # ✅ heavy check — a tick, not a sticker
    0x2630,                          # ☰ trigram — the hamburger
    0x2666, 0x2665, 0x2660, 0x2663,  # ♦ ♥ ♠ ♣ suits, used as bullets here
    0x25A0, 0x25AA, 0x25AB, 0x25B2,  # ▪ ▫ ▲ geometric
    0x25B6, 0x25BC, 0x25C0, 0x25CF,  # ▶ ▼ ◀ ●
    0x25B4, 0x25B8, 0x25BE, 0x25C2,  # ▴ ▸ ▾ ◂ disclosure triangles
    0x25D0, 0x25D1, 0x25CB, 0x25CC,  # ◐ ◑ ○ ◌ half-circles — progress dials
    0x2022, 0x00B7,                  # • · bullets
    0x2026,                          # … ellipsis
    0x00D7,                          # × multiplication sign (close buttons)
    0x2190, 0x2191, 0x2192, 0x2193,  # ← ↑ → ↓
    0x2197, 0x2198, 0x2199, 0x2196,  # ↗ ↘ ↙ ↖ — ↗ is the external-link mark
    0x21A9, 0x21BB, 0x21C4, 0x21C5,  # ↩ ↻ ⇄ ⇅ — ⇅ is the sort control
    0x27A1, 0x2B06, 0x2B07,          # ➡ ⬆ ⬇ — ⬇ is download
    0x2039, 0x203A, 0x00AB, 0x00BB,  # ‹ › « »
    0x2212, 0x002B,                  # − +
    0x2605, 0x2606, 0x2B50,          # ★ ☆ ⭐ the favourite star — semantic, frozen
}


def is_candidate(o):
    """True for any codepoint that could be a pictographic emoji.

    Deliberately WIDE.  Anything caught here is then sorted into picto /
    functional / review — over-catching is recoverable, under-catching is the
    mistake that produced the 550 figure.
    """
    return (
        (0x1F000 <= o <= 0x1FAFF) or   # all the emoji planes
        (0x2600 <= o <= 0x27BF) or     # misc symbols + dingbats
        (0x2300 <= o <= 0x23FF) or     # misc technical — ⏰ lives here
        (0x2B00 <= o <= 0x2BFF) or     # misc symbols and arrows
        (0x25A0 <= o <= 0x25FF) or     # geometric shapes
        (0x2190 <= o <= 0x21FF) or     # arrows
        o in (0x2049, 0x203C, 0x00A9, 0x00AE, 0x2122)
    )


def name_of(ch):
    try:
        return unicodedata.name(ch)
    except ValueError:
        return '?'


# ---------------------------------------------------------------------------
# Blocks
# ---------------------------------------------------------------------------

def split_blocks(src):
    """Yield (label, kind, start, end) for every script/style block + markup.

    kind is 'script' (lexable), 'style' or 'markup'.
    """
    spans = []
    for m in re.finditer(r'<script(?![^>]*\ssrc=)([^>]*)>', src):
        attrs = m.group(1)
        idm = re.search(r'id="([^"]+)"', attrs)
        try:
            end = src.index('</script>', m.end())
        except ValueError:
            continue
        spans.append((idm.group(1) if idm else '(anon script)', 'script', m.end(), end))
    for m in re.finditer(r'<style([^>]*)>', src):
        idm = re.search(r'id="([^"]+)"', m.group(1))
        try:
            end = src.index('</style>', m.end())
        except ValueError:
            continue
        spans.append((idm.group(1) if idm else '(anon style)', 'style', m.end(), end))
    spans.sort(key=lambda x: x[2])

    out, cur = [], 0
    for label, kind, st, en in spans:
        if st > cur:
            out.append(('(markup)', 'markup', cur, st))
        out.append((label, kind, st, en))
        cur = en
    if cur < len(src):
        out.append(('(markup)', 'markup', cur, len(src)))
    return out


def comment_mask(text):
    """Bool list: True where the char sits inside a JS comment."""
    mask = bytearray(len(text))
    for st, en, state in lex_spans(text):
        if state in (LINE, BLOCK):
            for i in range(st, min(en, len(text))):
                mask[i] = 1
    return mask


# ---------------------------------------------------------------------------
# Finding the three encodings
# ---------------------------------------------------------------------------

ENT_RE = re.compile(r'&#(\d+);|&#[xX]([0-9a-fA-F]+);')
PAIR_RE = re.compile(r'\\u([dD][89abAB][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})')
ESC_RE = re.compile(r'\\u([0-9a-fA-F]{4})')
BRACE_RE = re.compile(r'\\u\{([0-9a-fA-F]+)\}')


def find_all(text):
    """Yield (offset, length, codepoint, encoding) for every candidate."""
    for i, ch in enumerate(text):
        o = ord(ch)
        if is_candidate(o):
            yield (i, 1, o, 'literal')
    for m in ENT_RE.finditer(text):
        o = int(m.group(1)) if m.group(1) else int(m.group(2), 16)
        if is_candidate(o):
            yield (m.start(), len(m.group(0)), o, 'entity')
    taken = set()
    for m in PAIR_RE.finditer(text):
        hi, lo = int(m.group(1), 16), int(m.group(2), 16)
        o = 0x10000 + ((hi - 0xD800) << 10) + (lo - 0xDC00)
        taken.update(range(m.start(), m.end()))
        if is_candidate(o):
            yield (m.start(), len(m.group(0)), o, 'escape')
    for m in ESC_RE.finditer(text):
        if m.start() in taken:
            continue
        o = int(m.group(1), 16)
        if 0xD800 <= o <= 0xDFFF:
            continue
        if is_candidate(o):
            yield (m.start(), len(m.group(0)), o, 'escape')
    for m in BRACE_RE.finditer(text):
        o = int(m.group(1), 16)
        if is_candidate(o):
            yield (m.start(), len(m.group(0)), o, 'escape')


def census(path):
    src = open(path, encoding='utf-8').read()
    rows = []
    for label, kind, st, en in split_blocks(src):
        text = src[st:en]
        mask = comment_mask(text) if kind == 'script' else None
        for off, ln, o, enc in find_all(text):
            in_comment = bool(mask[off]) if mask is not None else False
            if o in BRAND:
                bucket = 'brand'
            elif o in FUNCTIONAL:
                bucket = 'functional'
            elif (0x1F000 <= o <= 0x1FAFF) or (0x2300 <= o <= 0x23FF) \
                    or (0x2600 <= o <= 0x26FF):
                bucket = 'picto'
            else:
                bucket = 'review'
            rows.append({
                'block': label, 'kind': kind, 'abs': st + off, 'len': ln,
                'cp': o, 'char': chr(o), 'enc': enc,
                'comment': in_comment, 'skip': label in SKIP_BLOCKS,
                'bucket': bucket,
            })
    return src, rows


def in_scope(r):
    return r['bucket'] == 'picto' and not r['comment'] and not r['skip']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('path', nargs='?', default='index.html')
    ap.add_argument('--blocks', action='store_true')
    ap.add_argument('--char')
    ap.add_argument('--json', action='store_true')
    a = ap.parse_args()

    src, rows = census(a.path)

    if a.char:
        want = ord(a.char) if len(a.char) == 1 else int(a.char, 16)
        hits = [r for r in rows if r['cp'] == want]
        print(f"{chr(want)} U+{want:04X} {name_of(chr(want))} — {len(hits)} site(s)\n")
        for r in hits:
            line = src.count('\n', 0, r['abs']) + 1
            flags = ' '.join(f for f, on in
                             (('COMMENT', r['comment']), ('SKIPPED-BLOCK', r['skip']))
                             if on) or 'in scope' if in_scope(r) else 'out of scope'
            print(f"  line {line:>6}  {r['enc']:<8} {r['block']:<22} {flags}")
        return

    scope = [r for r in rows if in_scope(r)]

    if a.json:
        print(json.dumps({'total_candidates': len(rows), 'in_scope': len(scope)}))
        return

    tot = len(rows)
    n_comment = sum(1 for r in rows if r['comment'])
    n_skip = sum(1 for r in rows if r['skip'] and not r['comment'])
    n_func = sum(1 for r in rows if r['bucket'] == 'functional'
                 and not r['comment'] and not r['skip'])
    n_brand = sum(1 for r in rows if r['bucket'] == 'brand'
                  and not r['comment'] and not r['skip'])
    n_rev = sum(1 for r in rows if r['bucket'] == 'review'
                and not r['comment'] and not r['skip'])

    print(f"file: {a.path}\n")
    print(f"  candidates found (all 3 encodings) ......... {tot:>5}")
    print(f"  - inside comments (banners, prose) ......... {n_comment:>5}  excluded")
    print(f"  - inside {'/'.join(SKIP_BLOCKS)} .................. {n_skip:>5}  excluded (historical record)")
    print(f"  - functional UI glyphs (checkbox/arrow/…) .. {n_func:>5}  counted apart")
    print(f"  - ®/™/© brand marks ........................ {n_brand:>5}  NEVER TOUCH (OC_BRAND_RULES)")
    print(f"  - unclassified, NEEDS A HUMAN CALL ......... {n_rev:>5}  see --char")
    print(f"  {'=' * 52}")
    print(f"  IN SCOPE FOR THE SWEEP ..................... {len(scope):>5}")

    enc = {}
    for r in scope:
        enc[r['enc']] = enc.get(r['enc'], 0) + 1
    print("\n  by encoding: " + ', '.join(f"{k} {v}" for k, v in sorted(enc.items())))
    print(f"  distinct characters: {len({r['cp'] for r in scope})}")

    if a.blocks:
        per = {}
        for r in scope:
            per.setdefault(r['block'], []).append(r)
        print(f"\n  {'block':<26} {'n':>4}  characters")
        print(f"  {'-' * 26} {'-' * 4}  {'-' * 40}")
        for label, rs in sorted(per.items(), key=lambda x: -len(x[1])):
            chars = ''.join(sorted({r['char'] for r in rs}))
            print(f"  {label:<26} {len(rs):>4}  {chars[:40]}")

    if n_rev:
        print(f"\n  ⚠ {n_rev} unclassified. They are NOT in the total above.")
        seen = {}
        for r in rows:
            if r['bucket'] == 'review' and not r['comment'] and not r['skip']:
                seen[r['cp']] = seen.get(r['cp'], 0) + 1
        for cp, n in sorted(seen.items(), key=lambda x: -x[1])[:15]:
            print(f"      {chr(cp)}  U+{cp:04X}  x{n:<4} {name_of(chr(cp))}")


if __name__ == '__main__':
    main()
