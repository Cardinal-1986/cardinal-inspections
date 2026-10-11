"""Build 1293 — the Job Menu's "Communication" stops splitting at 360px, Larger text.

gate_1224 had been red since 1287 (the app sans is wider than the old face): at a
360px phone with Larger text (zoom 1.15) the label read "Communicatio / n". The
Largest size already had a narrow-phone rule (1224); Larger had none. This gives
Larger the same tighter tile below 400px. No label is renamed and nothing truncates.

Also: the Line Items head buttons' corner had drifted to 11px (gate_1223); back on --btn-rad.

Usage: python3 patch_1293.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)
A = '@media (max-width:400px){ :root[data-cr-text="xl"] .jaboxrow{grid-template-columns:minmax(0,1fr);} }\n'
src = pl.sub(src, A, A + '/* 1293: Larger (zoom 1.15) on a sub-400px phone split "Communication" once the app\n   took one sans (1287). Same tighter tile the Largest size got at 1224. */\n'
  '@media (max-width:400px){ :root[data-cr-text="lg"] .jabox{padding-left:6px;padding-right:6px;gap:4px;} :root[data-cr-text="lg"] .jabox .jbl{font-size:13px;} }\n')
# gate_1223: Line Items' head buttons had drifted to an 11px corner; every other button is --btn-rad (12px)
src = pl.sub(src, ".cr-lil-head button{background:transparent;border:1px solid rgba(230,235,240,.18);min-height:44px;padding:0 14px;border-radius:11px;",
                  ".cr-lil-head button{background:transparent;border:1px solid rgba(230,235,240,.18);min-height:44px;padding:0 14px;border-radius:var(--btn-rad,12px);")
src = pl.sub(src, '">v2026-10-10 build 1292<button', '">v2026-10-10 build 1293<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1292,",
  "var CHANGELOG = [\n"
  "  { b: 1293, d: '2026-10-10', t: 'Communication fits on a small phone',\n"
  "    s: 'With Larger text turned on, a small phone showed the Job Menu tile as Communicatio / n. The tile is a little tighter there now, so every word stays whole. The Line Items buttons also get the same rounded corners as every other button.' },\n"
  "  { b: 1292,")
pl.write_atomic(PATH, src)
print('patched 1293')
