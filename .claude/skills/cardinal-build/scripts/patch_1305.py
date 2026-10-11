"""Build 1305 — Buttons A, part 2: Claims, Pricing and Coach (Theo: "You choose" -> 1A).

These three modules share one palette whose dark-mode --cr-red is the pink
#ff6b6b — right for red TEXT on a dark ground (Cardinal red #c8202e is under the
floor as text there), wrong as a button fill. So the main action was a pink block
and every other button a filled grey block. Option A, the rule the rest of the app
already follows: one solid Cardinal red main action, everything else an outline.

Edited at the source rules, not overridden (the preview used !important overrides
to show the look; the build does not). The token --cr-red is untouched, so every
red WORD in these modules keeps its readable ink. New, with literal fallbacks:
  --cr-act    #c8202e  the main action's fill, both themes
  --cr-act-dk #8f1620  its hover (was --cr-red-dark, a lighter pink in dark)
  --cr-btnline #33333d dark / #c9cdd3 light  the outline (declared in each light block)
Adjusters has no buttons of its own here, so nothing changes there.

Usage: python3 patch_1305.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)
ACT = "var(--cr-act,#c8202e)"; ACTDK = "var(--cr-act-dk,#8f1620)"; LINE = "var(--cr-btnline,#33333d)"
E = [
# Pricing
("#cr-pricing-mount .cr-p-tool-btn { padding: 10px 14px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; cursor: pointer; font-family: inherit; background: var(--cr-bg); border: 1px solid var(--cr-border); color: var(--cr-text); }",
 "#cr-pricing-mount .cr-p-tool-btn { padding: 10px 14px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; cursor: pointer; font-family: inherit; background: transparent; border: 1px solid " + LINE + "; color: var(--cr-text); }"),
("#cr-pricing-mount .cr-p-tool-btn.primary { background: var(--cr-red); border-color: var(--cr-red); color: white; }",
 "#cr-pricing-mount .cr-p-tool-btn.primary { background: " + ACT + "; border-color: " + ACT + "; color: white; }"),
("#cr-pricing-mount .cr-p-tool-btn.primary:hover { background: var(--cr-red-dark); color: white; }",
 "#cr-pricing-mount .cr-p-tool-btn.primary:hover { background: " + ACTDK + "; border-color: " + ACTDK + "; color: white; }"),
("#cr-pricing-mount .cr-p-modal-btn { padding: 10px 18px; border-radius: 4px; font-size: 13px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; cursor: pointer; font-family: inherit; border: 1px solid var(--cr-border); background:var(--cr-bg,#fff); color: var(--cr-text); }",
 "#cr-pricing-mount .cr-p-modal-btn { padding: 10px 18px; border-radius: 4px; font-size: 13px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; cursor: pointer; font-family: inherit; border: 1px solid " + LINE + "; background:transparent; color: var(--cr-text); }"),
("#cr-pricing-mount .cr-p-modal-btn.primary { background: var(--cr-red); color: white; border-color: var(--cr-red); }",
 "#cr-pricing-mount .cr-p-modal-btn.primary { background: " + ACT + "; color: white; border-color: " + ACT + "; }"),
# Claims
("#cr-claims-mount .cr-c-btn { flex: 1; padding: 12px 8px; border-radius: 4px; font-size: 13px; font-weight: 700; cursor: pointer; background: var(--cr-bg); border: 1px solid var(--cr-border); color: var(--cr-text);",
 "#cr-claims-mount .cr-c-btn { flex: 1; padding: 12px 8px; border-radius: 4px; font-size: 13px; font-weight: 700; cursor: pointer; background: transparent; border: 1px solid " + LINE + "; color: var(--cr-text);"),
("#cr-claims-mount .cr-c-btn.primary { background: #B01F21; color: white; border: 1px solid #B01F21; flex: 1.5; }",
 "#cr-claims-mount .cr-c-btn.primary { background: " + ACT + "; color: white; border: 1px solid " + ACT + "; flex: 1.5; }"),
("#cr-claims-mount .cr-c-btn.primary:hover { background: var(--cr-red-dark); }",
 "#cr-claims-mount .cr-c-btn.primary:hover { background: " + ACTDK + "; border-color: " + ACTDK + "; }"),
("#cr-claims-mount .cr-c-h-btn { background: var(--cr-bg); border: 1px solid var(--cr-border); color: var(--cr-muted);",
 "#cr-claims-mount .cr-c-h-btn { background: transparent; border: 1px solid " + LINE + "; color: var(--cr-text);"),
("#cr-claims-mount .cr-c-h-btn.primary { background: var(--cr-red); color: white; border-color: var(--cr-red); }",
 "#cr-claims-mount .cr-c-h-btn.primary { background: " + ACT + "; color: white; border-color: " + ACT + "; }"),
("#cr-claims-mount .cr-c-modal-btn { padding: 10px 18px; border-radius: 4px; font-size: 13px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; cursor: pointer; font-family: inherit; border: 1px solid var(--cr-border); background:var(--cr-bg,#fff); color: var(--cr-text); }",
 "#cr-claims-mount .cr-c-modal-btn { padding: 10px 18px; border-radius: 4px; font-size: 13px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; cursor: pointer; font-family: inherit; border: 1px solid " + LINE + "; background:transparent; color: var(--cr-text); }"),
("#cr-claims-mount .cr-c-modal-btn.primary { background: var(--cr-red); color: white; border-color: var(--cr-red); }",
 "#cr-claims-mount .cr-c-modal-btn.primary { background: " + ACT + "; color: white; border-color: " + ACT + "; }"),
# Coach
("#cr-coach-mount .cr-k-btn{ flex:1; min-width:120px; padding:12px 8px; border-radius:4px; font-size:13px; font-weight:700; cursor:pointer; background:var(--cr-bg,#fff); border:1px solid var(--cr-border); color:var(--cr-text);",
 "#cr-coach-mount .cr-k-btn{ flex:1; min-width:120px; padding:12px 8px; border-radius:4px; font-size:13px; font-weight:700; cursor:pointer; background:transparent; border:1px solid " + LINE + "; color:var(--cr-text);"),
("#cr-coach-mount .cr-k-btn.primary{ background:var(--cr-red); color:#fff; border-color:var(--cr-red); flex:1.6; }",
 "#cr-coach-mount .cr-k-btn.primary{ background:" + ACT + "; color:#fff; border-color:" + ACT + "; flex:1.6; }"),
("#cr-coach-mount .cr-k-btn.primary:hover{ background:var(--cr-red-dark); }",
 "#cr-coach-mount .cr-k-btn.primary:hover{ background:" + ACTDK + "; border-color:" + ACTDK + "; }"),
("#cr-coach-mount .cr-k-modal-btn{ padding:10px 18px; border-radius:4px; font-size:13px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; cursor:pointer; font-family:inherit; border:1px solid var(--cr-border); background:var(--cr-bg,#fff); color:var(--cr-text); }",
 "#cr-coach-mount .cr-k-modal-btn{ padding:10px 18px; border-radius:4px; font-size:13px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; cursor:pointer; font-family:inherit; border:1px solid " + LINE + "; background:transparent; color:var(--cr-text); }"),
("#cr-coach-mount .cr-k-modal-btn.primary{ background:var(--cr-red); color:#fff; border-color:var(--cr-red); }",
 "#cr-coach-mount .cr-k-modal-btn.primary{ background:" + ACT + "; color:#fff; border-color:" + ACT + "; }"),
]
for a, b in E: src = pl.sub(src, a, b)
for m in ('pricing', 'claims', 'coach'):
    a = ':root[data-theme="rb-light"] #cr-' + m + '-mount{\n  --cr-red:#D9282A;'
    b = ':root[data-theme="rb-light"] #cr-' + m + '-mount{\n  --cr-btnline:#c9cdd3;   /* 1305: the outline button edge in light */\n  --cr-red:#D9282A;'
    src = pl.sub(src, a, b)
A = ">v2026-10-11 build 1304<button"; B = ">v2026-10-11 build 1305<button"; src = pl.sub(src, A, B)
A = "var CHANGELOG = [\n"
B = """var CHANGELOG = [
  { b: 1305, d: '2026-10-11', t: 'Claims, Pricing and Coach buttons match the rest of the app',
    s: 'On Insurance Claims, the Pricing catalog and the Coach, the main button was pink in dark mode and the other buttons were grey blocks. Now it is the same as everywhere else: one solid Cardinal red button for the main action, and the rest are outlines. Red words on those screens are unchanged.' },
"""
src = pl.sub(src, A, B)
pl.write_atomic(PATH, src)
print('patched', PATH)
