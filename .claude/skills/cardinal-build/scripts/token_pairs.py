#!/usr/bin/env python3
"""Contrast audit over pairs the APP declares, not pairs I guess.

Why this method: OPEN_ITEMS' own method note records that comparing 13 ink tokens
against 17 grounds produced 8 "failures"; pairing by what actually meets what cut
it to 2. And build 489 found a real failure the light-theme-only audit missed,
because a token is a dark/light PAIR and checking one half is not checking it.

So: find every rule that sets BOTH a colour and a background. That rule is the
app's own statement that these two meet. Resolve each side per theme, compute.

Limits, stated rather than hidden:
  * Only rules carrying both properties. A colour inheriting its ground from an
    ancestor is invisible here - that is exactly what 487 was, and why this is an
    audit aid and not a gate.
  * -webkit-text-fill-color overrides color; such rules are skipped, not scored.
  * @media print is excluded - its ground is forced #fff.
  * Alpha colours (rgba) are skipped rather than guessed at.

Usage:
    python3 token_pairs.py ../../../../index.html
    python3 token_pairs.py <file> --floor 3.0
"""
import argparse
import re
import sys

TOKEN_DECL = re.compile(r"(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})")
RULE = re.compile(r"([^{}]{1,400})\{([^{}]{0,700})\}")
COLOR = re.compile(r"(?<!-)\bcolor\s*:\s*([^;}]+)")
BG = re.compile(r"\bbackground(?:-color)?\s*:\s*([^;}]+)")
VAR = re.compile(r"var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)")
HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")


def srgb(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(h):
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(x * 2 for x in h)
    if len(h) == 8:
        h = h[:6]
    if len(h) != 6:
        return None
    try:
        r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return None
    return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)


def ratio(fg, bg):
    a, b = lum(fg), lum(bg)
    if a is None or b is None:
        return None
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def strip_print_blocks(src):
    """Remove @media print { ... } - its ground is forced white."""
    out, i = [], 0
    for m in re.finditer(r"@media[^{]{0,120}\bprint\b[^{]{0,60}\{", src):
        if m.start() < i:
            continue
        depth, k = 0, m.end() - 1
        while k < len(src):
            if src[k] == "{":
                depth += 1
            elif src[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        out.append(src[i:m.start()])
        i = k + 1
    out.append(src[i:])
    return "".join(out)


def token_maps(src):
    """{theme: {token: hex}} - light = declared under an rb-light selector."""
    maps = {"dark": {}, "light": {}}
    for m in TOKEN_DECL.finditer(src):
        ob = src.rfind("{", 0, m.start())
        stop = max(src.rfind("}", 0, ob), src.rfind(";", 0, ob))
        sel = src[stop + 1:ob]
        theme = "light" if "rb-light" in sel else "dark"
        maps[theme].setdefault(m.group(1), m.group(2))
    return maps


def resolve(value, tmap, depth=0):
    """A CSS value -> a hex, or None if it is not a flat colour."""
    value = value.strip()
    if depth > 4:
        return None
    if value.startswith("#"):
        h = HEX.match(value)
        return h.group(0) if h else None
    v = VAR.match(value)
    if v:
        tok, fallback = v.group(1), v.group(2)
        if tok in tmap:
            return resolve(tmap[tok], tmap, depth + 1)
        return resolve(fallback, tmap, depth + 1) if fallback else None
    h = HEX.match(value)
    return h.group(0) if h else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--floor", type=float, default=4.5)
    args = ap.parse_args()

    raw = open(args.file, encoding="utf-8").read()
    src = strip_print_blocks(raw)
    print(f"scanned {len(src):,} chars "
          f"({len(raw) - len(src):,} removed as @media print)")

    tmaps = token_maps(src)
    print(f"tokens: {len(tmaps['dark'])} dark, {len(tmaps['light'])} light\n")

    rows, skipped = [], 0
    for m in RULE.finditer(src):
        sel, body = m.group(1), m.group(2)
        if "text-fill-color" in body:
            skipped += 1
            continue
        c, b = COLOR.search(body), BG.search(body)
        if not (c and b):
            continue

        # A selector regex starting after the previous '}' swallows any comment
        # sitting between rules. Drop comments, then keep only the last line.
        clean = re.sub(r"/\*[\s\S]*?\*/", " ", sel)
        clean = re.sub(r"\s+", " ", clean.strip())[-58:]

        per_theme = {}
        for theme in ("dark", "light"):
            fg = resolve(c.group(1), tmaps[theme])
            bg = resolve(b.group(1), tmaps[theme])
            if not fg or not bg:
                continue
            r = ratio(fg, bg)
            if r is not None and r < args.floor:
                per_theme[theme] = (r, fg, bg)

        line = src.count("\n", 0, m.start()) + 1
        # If both themes resolve identically the rule uses literals and is
        # theme-independent - report it ONCE, as "both", not twice.
        if (len(per_theme) == 2
                and per_theme["dark"][1:] == per_theme["light"][1:]):
            r, fg, bg = per_theme["dark"]
            rows.append((r, "both", fg, bg, clean, line))
        else:
            for theme, (r, fg, bg) in per_theme.items():
                rows.append((r, theme, fg, bg, clean, line))

    rows.sort()
    seen, shown = set(), 0
    print(f"{'ratio':>7}  {'theme':<6} {'fg':<9} {'on':<9} selector")
    print("-" * 78)
    for r, theme, fg, bg, sel, line in rows:
        key = (theme, fg, bg, sel)
        if key in seen:
            continue
        seen.add(key)
        shown += 1
        print(f"{r:6.2f}:1  {theme:<6} {fg:<9} {bg:<9} L{line} {sel}")

    print("-" * 78)
    print(f"{shown} declared pair(s) below {args.floor}:1  "
          f"({skipped} rules skipped for text-fill-color)")
    print("\nBars, spines, dots and decorative rules are exempt - a 3px glow is not text.")
    print("Each hit still needs a look at what the element IS before it is a defect.")
    return 1 if shown else 0


if __name__ == "__main__":
    sys.exit(main())
