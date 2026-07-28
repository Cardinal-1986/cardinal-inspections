#!/usr/bin/env python3
"""Provable checks on a contract PDF before handover (HANDOFF §6e).

Usage:
    python3 verify_pdf.py FILE.pdf [--margin 42] [--print-master | --fillable N]

Checks:
  1. No overlapping words on any page
  2. All words within margins (x1 <= LW-margin, bottom <= LH-margin)
     and WITHIN page bounds — extract_text() also returns off-page text and lies
  3. No writing rule crossing a word's baseline (horizontal line through text)
  4. --print-master: get_fields() must be empty; --fillable N: exactly N fields
  5. No stroked/faux-bold text: '2 Tr' render mode absent (decompressed via qpdf)

Claude cannot see the render — say so. Theo is the final visual gate.
Exit 0 green / 1 red.
"""
import argparse
import re
import subprocess
import sys
import tempfile

import pdfplumber
from pypdf import PdfReader

fails = 0


def report(ok, msg):
    global fails
    print(("  \u2713" if ok else "  \u2717"), msg)
    if not ok:
        fails += 1


def overlap(a, b):
    return not (a["x1"] <= b["x0"] + 0.5 or b["x1"] <= a["x0"] + 0.5
                or a["bottom"] <= b["top"] + 0.5 or b["bottom"] <= a["top"] + 0.5)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--right-margin", type=float, default=41.0,
                    help="max allowed x1 = width - this (HANDOFF §6e: 571 on letter)")
    ap.add_argument("--bottom-margin", type=float, default=30.0,
                    help="max allowed bottom = height - this (§6e: 762 on letter; "
                         "footers live here by design)")
    ap.add_argument("--print-master", action="store_true",
                    help="assert zero form fields")
    ap.add_argument("--fillable", type=int, default=None,
                    help="assert exactly N form fields")
    ap.add_argument("--allow-offpage", action="store_true",
                    help="split_roof output keeps the full oversized source on "
                         "each page, masked white — off-page words are by design")
    args = ap.parse_args()

    with pdfplumber.open(args.pdf) as pdf:
        print(f"verify_pdf: {args.pdf} ({len(pdf.pages)} pages, "
              f"limits x1<=W-{args.right_margin:.0f} bottom<=H-{args.bottom_margin:.0f})")
        ov = mg = rl = 0
        for pno, p in enumerate(pdf.pages, 1):
            LWp, LHp = float(p.width), float(p.height)
            ws = [w for w in p.extract_words() if w["text"].strip()]
            # bound to on-page words only — off-page text lies
            on = [w for w in ws if 0 <= w["top"] and w["bottom"] <= LHp]
            off = len(ws) - len(on)
            if off and not args.allow_offpage:
                mg += off
                print(f"       p{pno}: {off} word(s) OFF the page entirely")
            elif off:
                print(f"       p{pno}: {off} off-page word(s) (masked split spill — allowed)")
            for i, a in enumerate(on):
                for b in on[i + 1:]:
                    if overlap(a, b):
                        ov += 1
                        if ov <= 5:
                            print(f"       p{pno}: overlap {a['text']!r}/{b['text']!r} @y{a['top']:.0f}")
            for w in on:
                if w["x1"] > LWp - args.right_margin + 1 \
                        or w["bottom"] > LHp - args.bottom_margin + 1:
                    mg += 1
                    if mg <= 5:
                        print(f"       p{pno}: outside limits {w['text']!r} "
                              f"x1={w['x1']:.0f} bottom={w['bottom']:.0f}")
            for ln in p.lines:
                if abs(ln["top"] - ln["bottom"]) > 0.6 or (ln["x1"] - ln["x0"]) < 8:
                    continue  # not a horizontal writing rule
                for w in on:
                    if w["top"] + 2 < ln["top"] < w["bottom"] - 2 \
                            and ln["x0"] < w["x1"] - 1 and ln["x1"] > w["x0"] + 1:
                        rl += 1
                        if rl <= 5:
                            print(f"       p{pno}: rule crosses {w['text']!r} @y{ln['top']:.0f}")
        report(ov == 0, f"no overlapping words ({ov} found)")
        report(mg == 0, f"all words within limits and page bounds ({mg} out)")
        report(rl == 0, f"no writing rule crossing a word baseline ({rl} found)")

    fields = PdfReader(args.pdf).get_fields() or {}
    if args.print_master:
        report(len(fields) == 0, f"print master has zero form fields ({len(fields)})")
    elif args.fillable is not None:
        report(len(fields) == args.fillable,
               f"fillable has exactly {args.fillable} fields ({len(fields)})")
    else:
        print(f"   (form fields present: {len(fields)} — pass --print-master or --fillable N to assert)")

    # stroked-text check on decompressed streams
    with tempfile.NamedTemporaryFile(suffix=".pdf") as tf:
        r = subprocess.run(["qpdf", "--qdf", "--object-streams=disable",
                            args.pdf, tf.name], capture_output=True)
        raw = open(tf.name, "rb").read() if r.returncode in (0, 3) else open(args.pdf, "rb").read()
    n = len(re.findall(rb"[^0-9.]2\s+Tr\b", raw))
    report(n == 0, f"no stroked/faux-bold text ('2 Tr' x{n})")

    print()
    if fails:
        print(f"RED — {fails} check(s) failed. Do NOT hand over.")
        sys.exit(1)
    print("GREEN — provable checks passed. Theo is the final visual gate.")
    sys.exit(0)


if __name__ == "__main__":
    main()
