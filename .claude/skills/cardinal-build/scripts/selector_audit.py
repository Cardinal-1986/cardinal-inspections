#!/usr/bin/env python3
"""Find EVERY definition of a CSS selector and report which one wins.

Build 388's most expensive bug: `.acthead` had four definitions — two adjacent
near the top (both patched, both dead) and the real winner ~39,000 lines later
in `cr-hd2-styles`. Source-order reasoning over the two rules you find first
ships a silent no-op. Run this before patching ANY selector.

Usage:
    python3 selector_audit.py index.html '.acthead'
    python3 selector_audit.py index.html '#punchView' --prop background

Reports per occurrence: line number, enclosing <style id>, whether it sits in
an @media block (and which), the full declaration body, and a verdict naming
the last-wins rule among equal-specificity non-media candidates.

Caveat: this is source-order + a coarse specificity count. It does not resolve
the cascade perfectly (no !important weighting across media, no inline styles).
INLINE styles beat every rule here regardless — grep separately for JS setting
.style.* on the element (that was build 378: styleMounts() force-set a
background inline, on a timer, beating all CSS).
"""

import argparse
import re
import sys


def style_blocks(src):
    out = []
    for m in re.finditer(r"<style\b([^>]*)>(.*?)</style\s*>", src, re.I | re.S):
        idm = re.search(r"id\s*=\s*[\"']?([^\"'\s>]+)", m.group(1))
        out.append((m.start(), m.end(), idm.group(1) if idm else "(no id)"))
    return out


def enclosing_media(src, idx, block_start):
    """Walk back from idx to block_start tracking brace depth to find an
    unclosed @media/@supports wrapper."""
    seg = src[block_start:idx]
    depth = 0
    stack = []
    i = 0
    while i < len(seg):
        c = seg[i]
        if c == "{":
            depth += 1
        elif c == "}":
            if stack and stack[-1][1] == depth:
                stack.pop()
            depth -= 1
        elif c == "@":
            m = re.match(r"@(media|supports)([^{]*)\{", seg[i:])
            if m:
                cond = re.sub(r"\s+", " ", m.group(2)).strip()
                stack.append((f"@{m.group(1)} {cond}".rstrip(), depth + 1))
        i += 1
    return stack[-1][0] if stack else None


def specificity(sel):
    """Coarse: (#ids, .classes+[attrs]+:pseudo, elements)."""
    ids = len(re.findall(r"#[\w-]+", sel))
    cls = len(re.findall(r"\.[\w-]+|\[[^\]]+\]|:[\w-]+", sel))
    els = len(re.findall(r"(?:^|[\s>+~])([a-zA-Z][\w-]*)", sel))
    return (ids, cls, els)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("selector", help="e.g. '.acthead' or '#punchView'")
    ap.add_argument("--prop", help="only report rules declaring this property")
    args = ap.parse_args()

    src = open(args.file, encoding="utf-8").read()
    blocks = style_blocks(src)
    sel = args.selector
    hits = []

    for m in re.finditer(re.escape(sel) + r"(?![\w-])", src):
        i = m.start()
        blk = next(((s, n) for s, e, n in blocks if s <= i <= e), None)
        if not blk:
            continue  # not inside a <style> — likely JS or markup
        # capture the full rule: back to the previous } or { , forward to }
        start = max(src.rfind("}", blk[0], i), src.rfind("{", blk[0], i),
                    src.rfind(";", blk[0], i)) + 1
        end = src.find("}", i)
        rule = src[start:end + 1].strip()
        if "{" not in rule:
            continue  # a mention inside another rule's body, not a selector
        selector_text = rule.split("{", 1)[0].strip()
        body = rule.split("{", 1)[1].rstrip("}").strip()
        if args.prop and not re.search(r"\b" + re.escape(args.prop) + r"\s*:", body):
            continue
        media = enclosing_media(src, i, blk[0])
        hits.append({
            "line": src.count("\n", 0, i) + 1,
            "block": blk[1],
            "media": media,
            "sel": selector_text,
            "body": body,
            "spec": specificity(selector_text),
            "important": "!important" in body,
        })

    if not hits:
        print(f"no <style> rules found for {sel!r}"
              + (f" declaring {args.prop!r}" if args.prop else ""))
        print("   (check JS: element.style.* assignments beat all CSS — build 378)")
        return 0

    print(f"{len(hits)} rule(s) for {sel!r}"
          + (f" declaring {args.prop!r}" if args.prop else "") + ":\n")
    for h in hits:
        tag = f"  line {h['line']:>6}  style#{h['block']:<20}"
        if h["media"]:
            tag += f"  [{h['media']}]"
        if h["important"]:
            tag += "  !important"
        print(tag)
        print(f"        {h['sel']} {{ {h['body'][:150]}{'...' if len(h['body'])>150 else ''} }}")
    print()

    def is_print_only(h):
        return "print" in (h["media"] or "") and "screen" not in (h["media"] or "")
    live = [h for h in hits if not is_print_only(h)]
    printed = [h for h in hits if is_print_only(h)]
    if printed:
        print(f"   ({len(printed)} print-only rule(s) excluded from the screen cascade: "
              f"lines {', '.join(str(h['line']) for h in printed)})")
    if not live:
        print("VERDICT: every rule is print-only.")
        return 0
    imp = [h for h in live if h["important"]]
    pool = imp if imp else live
    top = max(h["spec"] for h in pool)
    winners = [h for h in pool if h["spec"] == top]
    w = winners[-1]  # last one wins at equal specificity
    print(f"VERDICT: the winner is line {w['line']} in style#{w['block']}"
          + (f" [{w['media']}]" if w["media"] else "")
          + (" (!important)" if w["important"] else ""))
    dead = [h for h in live if h is not w]
    if dead:
        print(f"         {len(dead)} other live rule(s) — patching those alone is a "
              f"silent no-op: lines {', '.join(str(h['line']) for h in dead)}")
    print("         Inline styles still beat this. Grep JS for .style. on the element.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
