"""Build 1292 — Buttons A, phase 1 (Theo, 6 Oct: "red · outline · red text").

The main action is solid red with white text; every other action is an outline (no
fill, a hairline, ink text); Delete is red words with no fill. Phase 1 is the shared
.chipbtn, the estimate builder's add row, and Accounts Receivable. Every edit is AT
SOURCE — no new rule out-specifies an old one. Production and Dispatch are left alone
(Theo); Insurance and Community follow in a later phase.

Usage: python3 patch_1292.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)
E = [
 # .chipbtn — outline, no fill, both themes
 ("  border:1px solid var(--line);background:#fff;color:var(--ink);\n  padding:5px 10px;border-radius:5px;margin:2px 3px 2px 0;\n}",
  "  border:1px solid var(--line);background:transparent;color:var(--ink);\n  padding:5px 10px;border-radius:5px;margin:2px 3px 2px 0;\n}"),
 (".chipbtn.danger:hover{border-color:var(--red);color:#fff;background:var(--red);}",
  ".chipbtn.danger{--cr-stack:\"1292 Delete is red words (Buttons A)\";color:var(--red);border-color:transparent;background:transparent;}\n.chipbtn.danger:hover{border-color:var(--red);color:var(--red);background:transparent;} /* 1292: Delete is red words, never a red block */"),
 (':root:not([data-theme="rb-light"]) .chipbtn{background:#1b1b22;color:#e6e9ee;border-color:#33333d;}',
  ':root:not([data-theme="rb-light"]) .chipbtn{background:transparent;color:#e6e9ee;border-color:#33333d;}\n:root:not([data-theme="rb-light"]) .chipbtn.danger{--cr-stack:\"1292 Delete is red words, dark\";color:#ff7b82;border-color:transparent;}'),
 # estimate head Delete — red words, no fill on hover
 (".cr-est-head button.danger:hover{background:#c8202e;color:#fff;border-color:#c8202e}",
  ".cr-est-head button.danger:hover{background:transparent;color:#f08a90;border-color:#f08a90}"),
 # estimate add row — one red (+ From Library); the rest outline with ink
 (".cr-est-items-head .add-custom{background:transparent;color:var(--estc-red,#f08a90);border:1px solid var(--estc-red,#f08a90)}",
  ".cr-est-items-head .add-custom{background:transparent;color:var(--estc-ink,#e9ecf1);border:1px solid var(--estc-line,#262a30)}"),
 (".cr-est-items-head .add-abc{background:transparent;color:var(--estc-green,#34d399);border:1px solid var(--estc-green,#34d399);margin-left:6px}",
  ".cr-est-items-head .add-abc{background:transparent;color:var(--estc-ink,#e9ecf1);border:1px solid var(--estc-line,#262a30);margin-left:6px}"),
 (".cr-est-items-head .add-abc:hover{background:rgba(42,107,60,.1)}", ".cr-est-items-head .add-abc:hover{background:var(--estc-well,#1b1f24)}"),
 (".cr-est-items-head .add-custom:hover{background:rgba(200,32,46,.1)}", ".cr-est-items-head .add-custom:hover{background:var(--estc-well,#1b1f24)}"),
 (".cr-est-items-head .add-section{background:transparent;color:var(--estc-dim,#a8b0ba);border:1px solid var(--estc-line,#262a30)}",
  ".cr-est-items-head .add-section{background:transparent;color:var(--estc-ink,#e9ecf1);border:1px solid var(--estc-line,#262a30)}"),
 (".cr-est-items-head .add-assembly{background:var(--est-red,#c8202e);color:#fff;border:1px solid var(--est-red,#c8202e)}",
  ".cr-est-items-head .add-assembly{background:transparent;color:var(--estc-ink,#e9ecf1);border:1px solid var(--estc-line,#262a30)}"),
 (".cr-est-items-head .add-assembly:hover{background:#B01F21}", ".cr-est-items-head .add-assembly:hover{background:var(--estc-well,#1b1f24)}"),
 ("#cr-est-view .cr-est-items-head .add-custom{color:var(--estc-red,#f08a90);border:1px solid var(--estc-red,#f08a90);}",
  "#cr-est-view .cr-est-items-head .add-custom{color:var(--estc-ink,#e9ecf1);border:1px solid var(--estc-line,#262a30);}"),
 ("#cr-est-view .cr-est-items-head .add-abc{color:var(--estc-green,#34d399);border:1px solid var(--estc-green,#34d399);}",
  "#cr-est-view .cr-est-items-head .add-abc{color:var(--estc-ink,#e9ecf1);border:1px solid var(--estc-line,#262a30);}"),
 # estimate phone bar — Save Draft / Email are outlines with a hairline, not a red edge
 ("#cr-est-view .cr-est-phonebar button{flex:1;padding:13px 10px;border-radius:var(--btn-rad,12px);border:1px solid rgba(200,32,46,.55);background:none;",
  "#cr-est-view .cr-est-phonebar button{flex:1;padding:13px 10px;border-radius:var(--btn-rad,12px);border:1px solid var(--estc-line,#262a30);background:none;"),
 # AR — outline buttons, flat red primary
 ("  border:1px solid var(--est-line); background:var(--est-panel); color:var(--est-ink);\n  font-size:13px; font-weight:600; padding:8px 12px; min-height:44px; border-radius:10px; box-shadow:var(--est-lift);\n}",
  "  border:1px solid var(--est-line); background:transparent; color:var(--est-ink);\n  font-size:13px; font-weight:600; padding:8px 12px; min-height:44px; border-radius:10px; box-shadow:none;\n}"),
 ("#cr-ar-view .crar-btn:hover{box-shadow:var(--est-hover);}", "#cr-ar-view .crar-btn:hover{border-color:var(--est-dim);}"),
 ("#cr-ar-view .crar-btn.primary{background:var(--est-red); border-color:var(--est-red); color:#fff; box-shadow:0 2px 8px rgba(200,32,46,.28);}",
  "#cr-ar-view .crar-btn.primary{background:var(--est-red); border-color:var(--est-red); color:#fff; box-shadow:none;}"),
]
for a, b in E: src = pl.sub(src, a, b)
src = pl.sub(src, '">v2026-10-10 build 1291<button', '">v2026-10-10 build 1292<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1291,",
  "var CHANGELOG = [\n"
  "  { b: 1292, d: '2026-10-10', t: 'One red button per screen',\n"
  "    s: 'Buttons now follow one rule. The main action is solid red. Every other button is an outline with plain text, and Delete is red words with no red block behind it, so it never looks like Save. This round covers the small buttons used across the app, the add row on an estimate (only + From Library stays red), and Accounts Receivable.' },\n"
  "  { b: 1291,")
pl.write_atomic(PATH, src)
print('patched 1292')
