#!/usr/bin/env python3
"""WCAG contrast arithmetic. Contrast is not judgment — compute it.

Why (CLAUDE.md "What the gates cannot see"): stage and CRM colours are chosen
for a dark ground and collapse as text on a light one. Two shipped builds
carried unreadable chips before anyone noticed. When a surface goes light,
compute the ratio for EVERY colour that carries text.

Floors: 4.5:1 body text · 3.0:1 large text (>=18.66px bold / 24px) · 3.0:1 UI
Bars, spines and dots are exempt — a glowing 3px rule is not text.

Usage:
    python3 contrast.py '#c8202e' '#e8c23a' --on '#ffffff' '#202329'
    python3 contrast.py --scan index.html --token-prefix '--rbe-' --on '#f7f7f7'
    python3 contrast.py --scan index.html --js-map STAGE_COLOR --on '#ffffff'
"""

import argparse
import re
import sys


def srgb(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(hexstr):
    h = hexstr.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
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


def collect(path, prefix=None, jsmap=None):
    src = open(path, encoding="utf-8").read()
    out = {}
    if prefix:
        for m in re.finditer(re.escape(prefix) + r"([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})", src):
            out[prefix + m.group(1)] = m.group(2)
    if jsmap:
        m = re.search(re.escape(jsmap) + r"\s*=\s*\{([\s\S]{0,3000}?)\}", src)
        if m:
            for k, v in re.findall(r"['\"]?([\w -]+)['\"]?\s*:\s*['\"](#[0-9a-fA-F]{3,8})['\"]",
                                   m.group(1)):
                out[k] = v
    if not prefix and not jsmap:
        for m in re.finditer(r"(#[0-9a-fA-F]{6})", src):
            out.setdefault(m.group(1), m.group(1))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("colors", nargs="*", help="hex colours to test")
    ap.add_argument("--on", nargs="+", default=["#ffffff"], help="background(s)")
    ap.add_argument("--scan", help="pull colours out of this file")
    ap.add_argument("--token-prefix", help="e.g. --rbe- or --ccm-")
    ap.add_argument("--js-map", help="a JS object literal name, e.g. STAGE_COLOR")
    ap.add_argument("--floor", type=float, default=4.5)
    args = ap.parse_args()

    pool = {c: c for c in args.colors}
    if args.scan:
        pool.update(collect(args.scan, args.token_prefix, args.js_map))
    if not pool:
        print("no colours given"); return 1

    worst = 99.0
    fails = 0
    for bg in args.on:
        print(f"\non {bg}  (floor {args.floor}:1 for text)")
        rows = []
        for name, hexv in pool.items():
            r = ratio(hexv, bg)
            if r is None:
                continue
            rows.append((r, name, hexv))
        rows.sort()
        for r, name, hexv in rows:
            mark = "FAIL" if r < args.floor else ("large-only" if r < 4.5 else "ok  ")
            if r < args.floor:
                fails += 1
            worst = min(worst, r)
            label = f"{name} = {hexv}" if name != hexv else hexv
            print(f"  {r:5.2f}:1  {mark:<10} {label}")
        if rows:
            print(f"  range: {rows[0][0]:.2f}–{rows[-1][0]:.2f}:1")

    print(f"\n{fails} value(s) below {args.floor}:1. "
          f"Bars/spines/dots are exempt — a glowing 3px rule is not text.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
