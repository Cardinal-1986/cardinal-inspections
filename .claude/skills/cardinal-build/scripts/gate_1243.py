#!/usr/bin/env python3
"""gate_1243 — Theo's type scale ("Type 1", settled 6 Oct 2026) holds.

Every screen text size between 11 and 26px is one of the six steps: 11 / 13 / 15 / 18 / 22 / 26.
Applied at 1242 (stylesheets + markup) and 1243 (sizes built inside JavaScript).

OUT OF SCOPE, on purpose (each is asserted to still exist, so the exclusion cannot silently widen):
  * the document templates a client reads: INVOICE_BODY, INV_LIVE_CSS, REPORT_TEMPLATE and the
    Pre-Install Guide (cr-guide-script) — print pages, not the phone UI;
  * @media print sections, every `pt` size, and display numbers above 26px;
  * CSS comments (prose cannot create or hide a finding).
⚠ Sizes below 11 are gate_1081's floor, not this gate's.

A new off-scale size is RED the build it lands. Negative control: run it on 1242 (58 JS sizes).
usage:  python3 gate_1243.py [index.html]
"""
import re, sys
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
STEPS = {11, 13, 15, 18, 22, 26}
LONG  = re.compile(r'font-size:\s*([0-9]+(?:\.[0-9]+)?)px')
SHORT = re.compile(r'font:\s*(?:(?:normal|italic|oblique|small-caps|bold|bolder|lighter|[1-9]00)\s+){0,3}([0-9]+(?:\.[0-9]+)?)px')
DEF   = re.compile(r'(?:^|\n)\s*(?:function\s+([A-Za-z_$][\w$]*)|(?:var|const|let)\s+([A-Za-z_$][\w$]*)\s*=)')
DOCS  = {'INVOICE_BODY', 'INV_LIVE_CSS', 'REPORT_TEMPLATE'}
mask = bytearray(len(s))
for m in re.finditer(r'/\*.*?\*/', s, re.S): mask[m.start():m.end()] = b'\1' * (m.end() - m.start())
for m in re.finditer(r'@media\s+print[^{]*\{', s):
    d, i = 1, m.end()
    while d and i < len(s): d += (s[i] == '{') - (s[i] == '}'); i += 1
    mask[m.start():i] = b'\1' * (i - m.start())
scripts = [(m.start(), s.find('</script>', m.end()), (re.search(r'id="([^"]+)"', m.group(0)) or [None, '(main)'])[1])
           for m in re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>', s)]
off, kept, n = [], {}, 0
for rx in (LONG, SHORT):
    for m in rx.finditer(s):
        p = m.start(1)
        if mask[p]: continue
        v = float(m.group(1))
        if not (11 <= v <= 26): continue
        sc = [x for x in scripts if x[0] <= p < x[1]]
        if sc:
            a, b, sid = sc[0]
            defs = list(DEF.finditer(s, a, p)); fn = (defs[-1].group(1) or defs[-1].group(2)) if defs else '?'
            if sid == 'cr-guide-script' or fn in DOCS:
                kept[fn if fn in DOCS else sid] = kept.get(fn if fn in DOCS else sid, 0) + 1; continue
        n += 1
        if v not in STEPS: off.append((v, s[max(0, p - 50):p + 8].replace('\n', ' ')))
fails = 0
def ok(c, msg, d=''):
    global fails
    print(('  PASS  ' if c else '  FAIL  ') + msg + (('  -> ' + d) if d else '')); fails += (not c)
ok(n > 2000, 'the sweep saw the app (in-range screen sizes counted)', str(n))
ok(not off, 'every screen size from 11 to 26px is one of 11/13/15/18/22/26',
   '; '.join(f'{v}px …{c}' for v, c in off[:6]) + (f' (+{len(off)-6} more)' if len(off) > 6 else ''))
for k in ('INVOICE_BODY', 'INV_LIVE_CSS', 'REPORT_TEMPLATE', 'cr-guide-script'):
    ok(kept.get(k, 0) > 0, f'the {k} document is still excluded (and still exists)', str(kept.get(k, 0)))
print(('GATE 1243 RED' if fails else 'GATE 1243 GREEN') + f' — {n} screen sizes, {len(off)} off-scale')
sys.exit(1 if fails else 0)
