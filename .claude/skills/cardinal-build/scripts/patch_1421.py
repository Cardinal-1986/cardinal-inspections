"""Build 1421 — the shared task sheet reads on its white card (29 Oct 2026).

#tskModal (New work order, Measurements) is a white card with inline light-era inks, in a dark app. Measured in
Chromium at 1420: in DARK theme the Cancel button is 1.22:1 on the card (a dark-theme .chipbtn — light ink, no
ground — drawn on white), the list's .subnote/.loading inherit the dark theme's light --muted, the field labels
are #8a7a72 (4.11:1), the "carried from the signed contract" hint #b0a49b (2.43:1), and the close × is an 18x26
glyph at 3.25:1. The heading is Georgia, which 1418 took off every other screen heading.

The card stays white in both themes, the Forms 1 call (6 Oct): a paper sheet. So its inks are paper inks in both
themes — one scoped rule for the classes it borrows from the app, and the inline literals deepened in place.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)
def fn(src, name):
    i = src.find('function ' + name + '(')
    assert i >= 0 and src.count('function ' + name + '(') == 1, name
    j = src.find('{', i); d = 0; k = j
    while True:
        c = src[k]
        if c == '{': d += 1
        elif c == '}':
            d -= 1
            if d == 0: break
        k += 1
    return i, k + 1

# 1. the inline label inks inside the two builders that fill the sheet (sliced, so nothing else moves)
for name, n_label, n_hint in (('openWorkOrderPicker', 5, 1), ('openMeasModal', 1, 0)):
    a, b = fn(s, name); blk = s[a:b]
    assert blk.count('color:#8a7a72;') == n_label, (name, blk.count('color:#8a7a72;'))
    assert blk.count('color:#b0a49b;') == n_hint, (name, blk.count('color:#b0a49b;'))
    blk = blk.replace('color:#8a7a72;', 'color:#6b5d56;')   # 1421: 4.11 -> 6.32:1 on the white card
    blk = blk.replace('color:#b0a49b;', 'color:#6b5d56;')   # 1421: 2.43 -> 6.32:1
    s = s[:a] + blk + s[b:]

# 2. the close × (an 18x26 glyph at 3.25:1) and the Georgia heading
s = one(s, """    <span id="tskModalX" style="position:absolute;top:12px;right:16px;font:400 22px Arial;color:#9a8c85;cursor:pointer;">&#10005;</span>
    <h2 id="tskModalTitle" style="margin:0 0 18px;text-align:center;font:800 22px Georgia,'Times New Roman',serif;letter-spacing:.02em;color:#1c1416;"></h2>""",
"""    <span id="tskModalX" role="button" aria-label="Close" style="position:absolute;top:4px;right:6px;width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;font:400 22px Arial;color:#5c534c;cursor:pointer;">&#10005;</span>
    <h2 id="tskModalTitle" style="margin:0 0 18px;text-align:center;font:800 22px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;letter-spacing:.02em;color:#1c1416;"></h2>""")

# 3. the classes the sheet borrows from the app take paper inks in both themes
s = one(s, """<!-- ============ TASK MODAL ============ -->""",
"""<!-- ============ TASK MODAL ============ -->
<style id="cr-tsk-paper-styles">
/* 1421: #tskModal is a white paper card in both themes (Forms 1), so what it borrows from the app takes paper inks:
   in dark theme .chipbtn (Cancel) was light ink on white, 1.22:1, and .subnote/.loading inherited the light --muted. */
#tskModal .subnote, #tskModal .loading, #tskModal p{color:#5c534c;}
#tskModal .chipbtn{--cr-stack:"1421 paper card: an outline button with ink, the Buttons A secondary";
  background:#ffffff;color:#2a2224;border:1px solid #cfc6bf;min-height:44px;padding:0 16px;}
</style>""")

s = one(s, ">v2026-10-29 build 1420<", ">v2026-10-29 build 1421<")
s = one(s, """  { b: 1420, d:'2026-10-29',""",
"""  { b: 1421, d:'2026-10-29', t:'The work order and Measurements boxes are readable in dark mode', s:'In dark mode the Cancel button on the New work order and Measurements boxes was almost invisible, and the field labels and hints were faint. Every label now reads clearly in both themes, the close \\u00d7 is easy to tap, and the heading uses the app\\u2019s own font.' },
  { b: 1420, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1421')
