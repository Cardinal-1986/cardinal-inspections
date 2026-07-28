#!/usr/bin/env python3
"""Mechanical build gates for the Cardinal Resource App.

Usage:
    python3 check_build.py NEW.html [--prev OLD.html] [--marker STR ...]

Gates run, in order:
  1. Per-block `node --check` on every inline <script> (module scripts get .mjs)
  2. <script>/<style> open/close tag balance
  3. CSS brace balance per <style> block
  4. No duplicate <style id=> blocks (a second one shadows nothing)
  5. Dupe-API check: no `window.Cardinal*` plainly assigned more than once
     (Object.assign merges are exempt — they're the required pattern)
  5. Build label present (v2026-...); with --prev, label must have been bumped
  6. With --marker: marker present in NEW (assert on the artifact you wrote)
  7. With --prev + --marker: marker ABSENT from OLD (negative control — a gate
     that has never failed proves nothing)

Exit 0 on all green, 1 on any red. Stage to outputs ONLY on exit 0.
"""

import argparse
import os
import re
import subprocess
import sys
import tempfile

OK = "  \u2713"
BAD = "  \u2717"

fail_count = 0


def report(ok, msg):
    global fail_count
    print((OK if ok else BAD), msg)
    if not ok:
        fail_count += 1


SCRIPT_RE = re.compile(
    r"<script\b([^>]*)>(.*?)</script\s*>", re.IGNORECASE | re.DOTALL
)
STYLE_RE = re.compile(
    r"<style\b[^>]*>(.*?)</style\s*>", re.IGNORECASE | re.DOTALL
)

# type= values that are NOT executable JavaScript
NON_JS_TYPES = ("json", "text/template", "text/plain", "text/html", "importmap-ignore")


def inline_scripts(src):
    """Yield (index, attrs, body, is_module) for every inline executable script.

    Matches ALL script blocks regardless of attributes — a bare /<script>/
    regex misses blocks tagged with id= or type= (known CI gap class).
    """
    out = []
    for m in SCRIPT_RE.finditer(src):
        attrs, body = m.group(1), m.group(2)
        if re.search(r"\bsrc\s*=", attrs, re.I):
            continue  # external — nothing inline to check
        tm = re.search(r"type\s*=\s*[\"']?([^\"'\s>]+)", attrs, re.I)
        ty = (tm.group(1).lower() if tm else "")
        if ty and ty != "module" and not ("javascript" in ty or ty == "text/js"):
            if any(k in ty for k in ("json", "template", "plain", "html")):
                continue  # data block, not code
        if not body.strip():
            continue
        out.append((len(out), attrs.strip(), body, ty == "module"))
    return out


def gate_syntax(src):
    blocks = inline_scripts(src)
    bad = []
    with tempfile.TemporaryDirectory() as td:
        for i, attrs, body, is_mod in blocks:
            ext = ".mjs" if is_mod else ".js"
            p = os.path.join(td, f"block_{i}{ext}")
            with open(p, "w", encoding="utf-8") as f:
                f.write(body)
            r = subprocess.run(
                ["node", "--check", p], capture_output=True, text=True
            )
            if r.returncode != 0:
                first = (r.stderr.strip().splitlines() or ["?"])[0]
                bad.append(f"block {i} ({attrs[:40] or 'no attrs'}): {first}")
    report(not bad, f"node --check on {len(blocks)} inline script blocks")
    for b in bad:
        print("      ", b)
    return len(blocks)


def gate_tag_balance(src):
    so = len(re.findall(r"<script\b", src, re.I))
    sc = len(re.findall(r"</script\s*>", src, re.I))
    yo = len(re.findall(r"<style\b", src, re.I))
    yc = len(re.findall(r"</style\s*>", src, re.I))
    report(so == sc, f"<script> tag balance ({so} open / {sc} close)")
    report(yo == yc, f"<style> tag balance ({yo} open / {yc} close)")


def gate_css_braces(src):
    bad = []
    for i, m in enumerate(STYLE_RE.finditer(src)):
        css = m.group(1)
        # strip comments and quoted strings so braces inside them don't count
        css = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)
        css = re.sub(r"\"[^\"]*\"|'[^']*'", "", css)
        o, c = css.count("{"), css.count("}")
        if o != c:
            bad.append(f"style block {i}: {o} open / {c} close")
    report(not bad, "CSS brace balance in all <style> blocks")
    for b in bad:
        print("      ", b)


ASSIGN_RE = re.compile(r"^(.*?)\bwindow\.(Cardinal\w+)\s*=(?!=)", re.MULTILINE)


STYLE_OPEN_RE = re.compile(r"<style\b([^>]*)>", re.IGNORECASE)
ID_ATTR_RE = re.compile(r"\bid\s*=\s*[\"']?([^\"'\s>]+)", re.IGNORECASE)


def gate_dupe_style_ids(src):
    """A second <style id='X'> shadows nothing and confuses every future
    grep — new rules must append to the existing block (build 333 class)."""
    seen = {}
    for m in STYLE_OPEN_RE.finditer(src):
        im = ID_ATTR_RE.search(m.group(1))
        if im:
            seen.setdefault(im.group(1), 0)
            seen[im.group(1)] += 1
    dupes = {k: v for k, v in seen.items() if v > 1}
    report(not dupes, "no duplicate <style id=> blocks")
    for k, v in sorted(dupes.items()):
        print(f"       <style id=\"{k}\"> appears {v}x — fold into the original block")


def gate_dupe_api(src):
    plain = {}
    for m in ASSIGN_RE.finditer(src):
        prefix, name = m.group(1), m.group(2)
        # Object.assign(window.X || {}, ...) is the sanctioned merge pattern;
        # also skip compound assigns and comparisons caught by lookahead above.
        line = src[max(0, m.start() - 120): m.end() + 40]
        if "Object.assign" in prefix or f"Object.assign(window.{name}" in line:
            continue
        plain.setdefault(name, 0)
        plain[name] += 1
    dupes = {k: v for k, v in plain.items() if v > 1}
    report(
        not dupes,
        "dupe-API check (no window.Cardinal* plainly assigned twice)",
    )
    for k, v in sorted(dupes.items()):
        print(f"       window.{k} plainly assigned {v}x — use Object.assign merge")


# The date alone is not the build identity: two builds ship on one day routinely,
# and comparing date-sets reported a false RED on 390 and 391. Capture the build
# NUMBER as well, so the bump gate measures what actually has to change.
LABEL_RE = re.compile(r"v2026-[\w.\-]+(?:\s+build\s+\d+)?")


def gate_label(src, prev_src):
    labels = sorted(set(LABEL_RE.findall(src)))
    report(bool(labels), f"build label present: {', '.join(labels) or 'NONE'}")
    if prev_src is not None:
        prev = sorted(set(LABEL_RE.findall(prev_src)))
        report(
            labels != prev,
            f"build label bumped (prev: {', '.join(prev) or 'NONE'})",
        )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("new", help="the build you just wrote")
    ap.add_argument("--prev", help="previous build, for bump + negative control")
    ap.add_argument(
        "--marker",
        action="append",
        default=[],
        help="string your fix added; asserted present in NEW, absent in --prev",
    )
    args = ap.parse_args()

    with open(args.new, encoding="utf-8") as f:
        src = f.read()
    prev_src = None
    if args.prev:
        with open(args.prev, encoding="utf-8") as f:
            prev_src = f.read()

    print(f"check_build: {args.new} ({len(src):,} bytes)")
    gate_syntax(src)
    gate_tag_balance(src)
    gate_css_braces(src)
    gate_dupe_style_ids(src)
    gate_dupe_api(src)
    gate_label(src, prev_src)

    for mk in args.marker:
        report(mk in src, f"marker present in artifact: {mk[:60]!r}")
        if prev_src is not None:
            report(
                mk not in prev_src,
                f"negative control — marker absent from prev: {mk[:60]!r}",
            )
    if args.marker and prev_src is None:
        print("   (no --prev given: negative control NOT run — a gate that has")
        print("    never failed proves nothing. Provide --prev when possible.)")

    print()
    if fail_count:
        print(f"RED — {fail_count} gate(s) failed. Do NOT stage.")
        sys.exit(1)
    print("GREEN — mechanical gates passed. jsdom harness still required.")
    sys.exit(0)


if __name__ == "__main__":
    main()
