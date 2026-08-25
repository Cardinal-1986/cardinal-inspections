#!/usr/bin/env python3
"""audit_design_report.py — read audit_design.mjs's JSON, answer the design questions.

Kept separate from the sweep on purpose: the sweep is a ten-minute Chromium
walk and the analysis wants iterating on. One render, many readings.

WHAT IT IS CAREFUL ABOUT, because each of these would otherwise produce a
confident wrong number:

  1. VIEWPORT-DERIVED TYPE IS ONE DECISION, NOT MANY VALUES.
     A `clamp(19px,2.1vw,26px)` resolves to a different number at every width,
     so pooling three widths inflates the type scale with values nobody chose.
     Sizes are therefore classified by whether they survive across widths:
     present at ALL widths = a fixed decision; present at ONE = viewport math.

  2. THE UA DEFAULT IS NOT A DESIGN TOKEN.
     13.333px is Chromium's font-size for form controls. An element painting
     it has NO declared size — that is a gap, and it must not be counted as a
     step in the scale.

  3. THEMES ARE SEPARATE PALETTES.
     Pooling dark and light doubles every ground and makes a coherent pair of
     palettes look like chaos. Colour is always counted per theme.

  4. SINGLE-THEME SURFACES ARE A DECISION.
     The Showcase and OC Colors are deliberately "Blackout" (OPEN_ITEMS,
     settled). audit_design.mjs tags them; they are excluded here rather than
     reported as inconsistency.

  usage:  python3 audit_design_report.py design.json [--md out.md]
"""
import json, sys, re
from collections import Counter, defaultdict

path = sys.argv[1]
MD = None
if '--md' in sys.argv:
    MD = sys.argv[sys.argv.index('--md') + 1]

blob = json.load(open(path))
H = [r for r in blob['harvest'] if not r.get('blackout')]
BLACK = len(blob['harvest']) - len(H)
WIDTHS = sorted({r['vw'] for r in H})
THEMES = sorted({r['theme'] for r in H})
SCREENS = sorted({r['screen'] for r in H})

out = []
def say(s=''):
    print(s)
    out.append(s)

def rel_lum(css):
    m = re.findall(r'[\d.]+', css or '')
    if len(m) < 3:
        return None
    r, g, b = [float(x) / 255 for x in m[:3]]
    a = float(m[3]) if len(m) > 3 else 1.0
    if a < 0.5:
        return None                      # too sheer to be "the ground"
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

say('# Design audit — measured\n')
say(f'{len(H):,} visible-element records across **{len(SCREENS)} screens** × '
    f'{len(THEMES)} themes × {len(WIDTHS)} widths ({", ".join(str(w)+"px" for w in WIDTHS)}).')
say(f'{BLACK:,} further records on the Blackout surfaces (Showcase, OC Colors) are '
    f'excluded — those are deliberately outside both app themes.\n')

# ── 1. TYPE ───────────────────────────────────────────────────────────────
UA_DEFAULT = 13.3333
text = [r for r in H if r.get('text') and r.get('fs')]
by_width = {w: {round(r['fs'], 2) for r in text if r['vw'] == w} for w in WIDTHS}
allw = set.intersection(*by_width.values()) if by_width else set()
anyw = set.union(*by_width.values()) if by_width else set()
fluid = anyw - allw

fixed_sizes = sorted(s for s in allw if abs(s - UA_DEFAULT) > 0.01)
ua_hits = [r for r in text if abs(r['fs'] - UA_DEFAULT) < 0.01]

say('## 1 · Type\n')
say(f'**{len(fixed_sizes)} fixed type sizes** hold at every width — that is the real scale.')
say(f'**{len(fluid)} further values** appear at some widths and not others: viewport math '
    f'(`vw`/`clamp`), one decision resolving to many numbers, not extra steps.\n')
say('| px | uses | modules |')
say('|---:|---:|---|')
cnt = Counter(round(r['fs'], 2) for r in text)
own = defaultdict(set)
for r in text:
    own[round(r['fs'], 2)].add(r['owner'])
for s in fixed_sizes:
    say(f'| {s:g} | {cnt[s]:,} | {len(own[s])} |')
say('')
if ua_hits:
    ua_owners = Counter(r['owner'] for r in ua_hits)
    say(f'⚠ **{len(ua_hits):,} text elements paint {UA_DEFAULT}px — Chromium\'s UA default for '
        f'form controls, i.e. no declared size at all.** Top: ' +
        ', '.join(f'`{k}` ({v})' for k, v in ua_owners.most_common(5)) + '\n')

singles = [s for s in fixed_sizes if cnt[s] <= 3]
if singles:
    say(f'Sizes used three times or fewer — the tail that makes a scale stop being a scale: ' +
        ', '.join(f'**{s:g}px** ({cnt[s]}, `{list(own[s])[0]}`)' for s in singles) + '\n')

say('### Weights\n')
w_cnt = Counter(r['fw'] for r in text)
say(', '.join(f'**{k}** ({v:,})' for k, v in w_cnt.most_common()) + '\n')

say('### Families\n')
f_cnt = Counter(r['ff'] for r in text)
f_own = defaultdict(set)
for r in text:
    f_own[r['ff']].add(r['owner'])
say('| first family in the stack | uses | modules |')
say('|---|---:|---|')
for k, v in f_cnt.most_common():
    say(f'| `{k}` | {v:,} | {len(f_own[k])} |')
say('')

# ── 2. COLOUR, PER THEME ──────────────────────────────────────────────────
say('## 2 · Colour\n')
for th in THEMES:
    rows = [r for r in H if r['theme'] == th and r.get('bg')]
    inks = [r for r in H if r['theme'] == th and r.get('text')]
    bgc = Counter(r['bg'] for r in rows)
    inkc = Counter(r['color'] for r in inks)
    label = 'dark (default)' if th == 'default' else th
    say(f'### {label}\n')
    say(f'- **{len(bgc)} distinct painted grounds**, {sum(1 for v in bgc.values() if v == 1)} used exactly once')
    say(f'- **{len(inkc)} distinct text colours**, {sum(1 for v in inkc.values() if v == 1)} used exactly once\n')

# light-era surfaces on the dark theme
dark_rows = [r for r in H if r['theme'] == 'default' and r.get('bg')]
light_on_dark = defaultdict(lambda: {'n': 0, 'screens': set(), 'owners': set()})
for r in dark_rows:
    L = rel_lum(r['bg'])
    if L is not None and L > 0.55:
        e = light_on_dark[r['bg']]
        e['n'] += 1
        e['screens'].add(r['screen'])
        e['owners'].add(r['owner'])
if light_on_dark:
    say('### Light-era grounds still painting on the DARK theme\n')
    say('Not a contrast failure by itself — several are legitimately light cards. '
        'It is a *consistency* question: a white card in a near-black app reads as '
        'a different product.\n')
    say('| ground | uses | screens | modules |')
    say('|---|---:|---|---|')
    for k, e in sorted(light_on_dark.items(), key=lambda kv: -kv[1]['n'])[:12]:
        say(f'| `{k}` | {e["n"]:,} | {", ".join(sorted(e["screens"])[:4])} | '
            f'{", ".join(sorted(e["owners"])[:3])} |')
    say('')

# ── 3. GEOMETRY ───────────────────────────────────────────────────────────
say('## 3 · Geometry\n')
boxes = [r for r in H if r.get('bg')]
rad = Counter(str(r['radius']) for r in boxes if r.get('radius') is not None)
say(f'**Corner radius: {len(rad)} distinct values**, '
    f'{sum(1 for v in rad.values() if v == 1)} used once.\n')
say('| radius | uses |')
say('|---|---:|')
for k, v in rad.most_common(12):
    say(f'| {k} | {v:,} |')
say('')

sh = Counter(r['shadow'] for r in boxes if r.get('shadow'))
say(f'**Box-shadow: {len(sh)} distinct**, {sum(1 for v in sh.values() if v == 1)} used once.\n')

gaps = Counter(r['gap'] for r in H if r.get('gap') is not None)
say(f'**flex/grid gap: {len(gaps)} distinct** — ' +
    ', '.join(f'{k:g}px ({v})' for k, v in gaps.most_common(10)) + '\n')

# ── 4. THE SAME CONTROL ACROSS MODULES ────────────────────────────────────
say('## 4 · One control, many opinions\n')
btn = [r for r in H if r['tag'] == 'BUTTON' and r.get('bg')]
bt_r = Counter(str(r.get('radius')) for r in btn)
bt_f = Counter(r.get('fs') for r in btn if r.get('fs'))
bt_p = Counter(r.get('pad') for r in btn if r.get('pad'))
say(f'`<button>` elements that paint a ground: **{len(btn):,}**')
say(f'- **{len(bt_r)} corner radii** — ' + ', '.join(f'{k} ({v})' for k, v in bt_r.most_common(8)))
say(f'- **{len(bt_p)} padding combinations**')
say(f'- **{len(bt_f)} type sizes**\n')

# ── 5. WHERE TO SPEND A BUILD ─────────────────────────────────────────────
say('## 5 · Modules by spread\n')
say('Which module contributes the most distinct values. This is the ranking that '
    'says where a build would actually buy something.\n')
byo = defaultdict(lambda: {'fs': set(), 'rad': set(), 'bg': set(), 'n': 0})
for r in H:
    e = byo[r['owner']]
    e['n'] += 1
    if r.get('fs'):
        e['fs'].add(round(r['fs'], 2))
    if r.get('radius') is not None:
        e['rad'].add(str(r['radius']))
    if r.get('bg'):
        e['bg'].add(r['bg'])
rank = sorted(byo.items(), key=lambda kv: -(len(kv[1]['fs']) + len(kv[1]['rad']) + len(kv[1]['bg'])))
say('| module | records | type sizes | radii | grounds |')
say('|---|---:|---:|---:|---:|')
for k, e in rank[:16]:
    say(f'| `{k}` | {e["n"]:,} | {len(e["fs"])} | {len(e["rad"])} | {len(e["bg"])} |')
say('')

if MD:
    open(MD, 'w').write('\n'.join(out) + '\n')
    print(f'\n→ {MD}')
