#!/usr/bin/env python3
"""audit_design_css.py — the AUTHORSHIP half of the design audit.

WHY THIS EXISTS, AND WHY IT IS SEPARATE FROM audit_design.mjs
  `audit_design.mjs` walks a real browser and counts what PAINTS. That is the
  right instrument for "how many type sizes does a user actually see", and it
  is deliberately blind to CSS that never applied.

  It cannot answer the other half: "how many decisions did somebody AUTHOR".
  Two font-size declarations for one element are one size on screen and two
  decisions in the file, and the authoring cost is real even when the cascade
  hides it.

  The 25 Aug design audit answered that half with ad-hoc greps typed at a
  shell. Every one of them was unreproducible the next day, and re-deriving
  them by hand gave a DIFFERENT answer for several — not because the app had
  moved, but because nobody recorded the scoping. This file IS that scoping.

  ⚠ THE RE-DERIVATION WAS ITSELF WRONG THE FIRST TIME, IN BOTH DIRECTIONS, AND
  THAT IS THE WHOLE ARGUMENT FOR THIS FILE. A hand grep "corrected" the audit's
  704 whole-px sites to 706 — the audit was right, and the grep had simply
  forgotten to strip comments. Two other hand counts were wrong in the other
  direction. A number without a recorded method is a claim, and a second
  hand count is not a check on the first; it is a second claim.

────────────────────────────────────────────────────────────────────────────
THE SCOPING, STATED ONCE, BECAUSE EVERY FIGURE DEPENDS ON IT

  1. MARKUP <style> BLOCKS ONLY.
     `<style>` also appears INSIDE <script> blocks, where it is a generated
     print document being built as a JS string. Six of them, ~34 KB, carrying
     123 font-size declarations and `:root{--ink:#1b1b1b}` for 11pt paper.
     CLAUDE.md's rig-trap section is about exactly this content: a rig that
     glued it to the app's CSS scored an invisible heading at 17.61:1.
     The test is positional and exact — a `<style>` whose offset falls inside
     a `<script>…</script>` region cannot be markup.

  2. CSS COMMENTS STRIPPED. They are **21%** of the markup CSS (~226 KB), and
     this file's own module banners quote values in prose. Leaving them in
     moves `!important` by 30 and whole-px font sizes by 2.
     Naive stripping is dangerous in JS (a `/*` inside a string literal is not
     a comment) — that is why the project has `jslex_count.py`. It is safe
     HERE because step 1 has already removed every JS region.

  3. MEDIA QUERIES ARE SCANNED PER PRELUDE, not by one lazy alternation.
     `@media (min-width:1100px) and (max-width:1599px)` carries TWO
     breakpoints, and a single lazy `(?:max|min)-width` pattern returns only
     the first. That fault is what put 22 in the audit instead of 23.

  Print-scoped rules that live in MARKUP blocks (10 `@page`/`@media print`
  hits) are kept: they are the app's own print stylesheets, authored here, and
  excluding them by pattern would take screen rules with them. The count is
  printed so the residue is visible rather than assumed.

────────────────────────────────────────────────────────────────────────────
    python3 audit_design_css.py [index.html] [--prev other.html]

  --prev prints both columns and the delta. That is the negative control, and
  it has already earned its place: it proved 1065's new 437px breakpoint was a
  real +1 rather than a regex difference, on the same run where a hand count
  had blamed a regex difference for a real change.
"""
import re, sys, collections

ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
FILE = ARGS[0] if ARGS else 'index.html'
PREV = sys.argv[sys.argv.index('--prev') + 1] if '--prev' in sys.argv else None

RE_SCRIPT  = re.compile(r'<script\b[^>]*>.*?</script>', re.S)
RE_STYLE   = re.compile(r'<style\b[^>]*>(.*?)</style>', re.S)
RE_COMMENT = re.compile(r'/\*.*?\*/', re.S)


def authored_css(path):
    """The app's authored screen CSS: markup <style> blocks, comments stripped."""
    s = open(path, encoding='utf-8').read()
    regions = [(m.start(), m.end()) for m in RE_SCRIPT.finditer(s)]
    inside = lambda i: any(a < i < b for a, b in regions)
    blocks = list(RE_STYLE.finditer(s))
    markup   = [b for b in blocks if not inside(b.start())]
    generated= [b for b in blocks if inside(b.start())]
    raw = '\n'.join(b.group(1) for b in markup)
    return {
        'src': s, 'raw': raw, 'css': RE_COMMENT.sub(' ', raw),
        'n_markup': len(markup), 'n_generated': len(generated),
        'gen_chars': sum(len(b.group(1)) for b in generated),
    }


def measure(path):
    a = authored_css(path)
    css, s = a['css'], a['src']
    m = {'_file': path}
    m['style_markup']    = a['n_markup']
    m['style_generated'] = a['n_generated']
    m['generated_chars'] = a['gen_chars']
    m['css_chars']       = len(css)
    m['comment_chars']   = len(a['raw']) - len(css)
    m['print_rules']     = len(re.findall(r'@page|@media\s+print', css))

    # ── type ────────────────────────────────────────────────────────────────
    dec   = re.findall(r'font-size\s*:\s*(\d+\.\d+)px', css)
    whole = re.findall(r'font-size\s*:\s*(\d+)px', css)
    m['fs_decimal_sites']    = len(dec)
    m['fs_decimal_distinct'] = len(set(dec))
    m['fs_whole_sites']      = len(whole)
    m['fs_whole_distinct']   = len(set(whole))
    m['fs_clamp_sites']      = len(re.findall(r'font-size\s*:\s*clamp\(', css))
    m['fs_top'] = (collections.Counter(dec) + collections.Counter(whole)).most_common(12)
    m['fs_small_decimal'] = sorted({float(x) for x in dec if float(x) < 16})

    # ── the system font, spelled four ways ──────────────────────────────────
    # Whole file on purpose: a stack in an inline style= attribute reaches the
    # user exactly as a stylesheet one does.
    m['stack_segoe'] = len(re.findall(r"'Segoe UI'\s*,\s*Arial\s*,\s*sans-serif", s))
    m['stack_apple'] = len(re.findall(r"-apple-system\s*,\s*BlinkMacSystemFont\s*,\s*'Segoe UI'", s))

    # ── tokens ──────────────────────────────────────────────────────────────
    m['muted_color_refs'] = len(re.findall(r'color\s*:[^;{}]*var\(\s*--muted', css))
    # `border[-a-z]*` on purpose: border-top/-color lean on the token exactly
    # as the shorthand does. The audit's hand count used the shorthand only.
    m['line_border_refs'] = len(re.findall(r'border[-a-z]*\s*:[^;{}]*var\(\s*--line', css))
    props = sorted(set(re.findall(r'(--[a-zA-Z0-9][-a-zA-Z0-9]*)\s*:', css)))
    m['props_distinct'] = len(props)
    pref = collections.Counter()
    for p in props:
        mm = re.match(r'--([a-z0-9]+)-', p)
        if mm: pref[mm.group(1)] += 1
    m['prefixes'] = len(pref)
    m['prefix_top'] = pref.most_common(8)

    # ── geometry ────────────────────────────────────────────────────────────
    bps = set()
    for p in re.findall(r'@media([^{]{0,300})\{', css):
        for x in re.findall(r'(?:max|min)-width\s*:\s*(\d+)px', p):
            bps.add(int(x))
    m['breakpoints'] = sorted(bps); m['breakpoints_n'] = len(bps)
    zs = {int(x) for x in re.findall(r'z-index\s*:\s*(-?\d+)', css)}
    m['zindex'] = sorted(zs); m['zindex_n'] = len(zs)

    # ── override debt ───────────────────────────────────────────────────────
    m['important'] = len(re.findall(r'!important', css))
    m['declarations'] = len(re.findall(r'[;{]\s*[-a-zA-Z][-a-zA-Z0-9]*\s*:', css))
    m['important_pct'] = round(100 * m['important'] / m['declarations'], 2)
    return m


def show(m, prev=None):
    def row(label, key, unit=''):
        v = m[key]
        line = f'  {label:38} {v:,}{unit}' if isinstance(v, int) else f'  {label:38} {v}{unit}'
        if prev is not None:
            p = prev[key]
            line += f'   ({p:,} -> {v:,}, {v-p:+,})' if isinstance(v, int) and v != p else '   (unchanged)'
        print(line)

    print(f"\n════ DESIGN AUDIT — authored CSS — {m['_file']}")
    if prev: print(f"     control: {prev['_file']}")
    print(f"  {m['style_markup']} markup <style> blocks, {m['css_chars']:,} chars after "
          f"stripping {m['comment_chars']:,} chars of comments")
    print(f"  excluded: {m['style_generated']} <style> blocks inside <script> "
          f"({m['generated_chars']:,} chars of generated print documents)")
    print(f"  kept but noted: {m['print_rules']} @page/@media print rules authored in markup")

    print('\n── type ─────────────────────────────────────────────────────────')
    row('font-size decimal px, sites',   'fs_decimal_sites')
    row('                     distinct', 'fs_decimal_distinct')
    row('font-size whole px, sites',     'fs_whole_sites')
    row('                    distinct',  'fs_whole_distinct')
    row('font-size clamp() sites',       'fs_clamp_sites')
    print(f"  decimal sizes below 16px: {m['fs_small_decimal']}")
    print('  most-declared: ' + ', '.join(f'{k}px ({v})' for k, v in m['fs_top']))

    print('\n── the system font, spelled four ways ───────────────────────────')
    row("'Segoe UI',Arial,sans-serif",   'stack_segoe')
    row("-apple-system,…,'Segoe UI'",    'stack_apple')

    print('\n── tokens ───────────────────────────────────────────────────────')
    row('var(--muted) in a color:',      'muted_color_refs')
    row('var(--line) in any border*:',   'line_border_refs')
    row('declared custom properties',    'props_distinct')
    row('namespace prefixes',            'prefixes')
    print('  biggest: ' + ', '.join(f'--{k}-* ({v})' for k, v in m['prefix_top']))

    print('\n── geometry ─────────────────────────────────────────────────────')
    row('media breakpoints',             'breakpoints_n')
    print(f"  {m['breakpoints']}")
    row('z-index values',                'zindex_n')
    print(f"  {m['zindex'][0]} … {m['zindex'][-1]}")

    print('\n── override debt ────────────────────────────────────────────────')
    row('!important',                    'important')
    row('declarations (prop after { or ;)', 'declarations')
    print(f"  {'ratio':38} {m['important_pct']}%")
    print()


show(measure(FILE), measure(PREV) if PREV else None)
