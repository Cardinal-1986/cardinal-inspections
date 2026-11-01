#!/usr/bin/env python3
"""patch_1436_gates.py <scripts_dir> (build 1436) — the minimal gate updates Sun (T8 C) needs, applied IN PLACE
to the scripts directory given (run it on a copy; it is never pointed at the repo by this build).

Every edit is exact-match with its count asserted before anything is written, and each says why.
The one reason, shared by all four: these gates counted the drawer's Appearance row as exactly
TWO buttons (Dark / Light). Sun is Theo's third choice there, so the row is Dark · Light · Sun.
What each gate actually protects is unchanged and still asserted:
  gate_1230 B  — the row is in the drawer, every button >=44px, Light lights, Dark darkens
  gate_1176    — ONE light/dark control on insurance (the shared row), retail keeps it
  gate_1181    — the same row on all three portals, flipping the right palette
  gate_804     — the drawer carries the switch where the header row cannot
No gate assumed a production account opens dark: gate_1400-family, 1416, 1317, 1206 and the
other production gates give the same result on both trees (see the build report), so none
of them is touched.
"""
import os
import sys

D = sys.argv[1]
EDITS = {
    'gate_1230.mjs': [
        ("    if (bs.length !== 2) return { n: bs.length };",
         "    if (bs.length !== 3) return { n: bs.length };   /* Sun (T8 C): the row is Dark · Light · Sun */"),
        ("  ok(r.n === 2 && r.h && Math.min(...r.h) >= 44, 'the drawer has Dark and Light, both ≥44px', JSON.stringify(r.h || r));",
         "  ok(r.n === 3 && r.h && Math.min(...r.h) >= 44, 'the drawer has Dark, Light and Sun, all ≥44px', JSON.stringify(r.h || r));"),
    ],
    'gate_1176.mjs': [
        ("  if (!vis(d) && document.querySelectorAll('#navMenu [data-cr-appear]').length === 2) n++;",
         "  if (!vis(d) && document.querySelectorAll('#navMenu [data-cr-appear]').length === 3) n++;   /* Sun (T8 C): Dark · Light · Sun is still ONE control */"),
        ("ok(s.crm === 'retail' && rowN === 2,",
         "ok(s.crm === 'retail' && rowN === 3,   /* Sun (T8 C): Dark · Light · Sun */"),
    ],
    'gate_1181.mjs': [
        ("  ok(s.n === 2, `${p}: the drawer's Appearance row is there (Dark / Light)`);",
         "  ok(s.n === 3, `${p}: the drawer's Appearance row is there (Dark / Light / Sun)`);   /* Sun (T8 C) */"),
    ],
    'gate_804.mjs': [
        ("ok('and the drawer carries the switch instead (Dark / Light)', D2 === 2, String(D2));",
         "ok('and the drawer carries the switch instead (Dark / Light / Sun)', D2 === 3, String(D2));   /* Sun (T8 C) */"),
        ("E.none ? E2 === 2 : E.host === 'cr-hd2-bar'",
         "E.none ? E2 === 3 : E.host === 'cr-hd2-bar'"),
    ],
}
staged = {}
for f, eds in EDITS.items():
    p = os.path.join(D, f)
    s = open(p, encoding='utf-8').read()
    for old, new in eds:
        n = s.count(old)
        assert n == 1, '%s: expected 1 of %r, found %d' % (f, old[:60], n)
        s = s.replace(old, new)
    staged[p] = s
for p, s in staged.items():
    tmp = p + '.tmp'
    open(tmp, 'w', encoding='utf-8').write(s)
    os.replace(tmp, p)
    print('patched', os.path.basename(p))
