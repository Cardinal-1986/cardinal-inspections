"""Build 1363 — Buttons A, part 3: Delete is red words, the last two red Delete blocks.
Theo, 17 Oct: "1 and 2" (Buttons A app-wide; the invoice redesign turned out already shipped at 1318/1319).
Measured first, not guessed: a Chromium census of every visible button across the sentinel's 33 states plus a
new Community walk (home, Estimates, Clients, Partners, the job page, Communication, Estimates), both themes,
390 and 1440px — 5,344 controls. Main actions are one red per group everywhere it walked. What was left:
- **Delete Client** (#delClientBtn) was a solid Cardinal-red block with a red glow, styled INLINE — the exact
  look of Save, on the one button that cannot be undone. On Retail and Insurance it is behind the Admin row; on
  Community it shows on the job page. Now red words with no fill, 44px, in the ink each ground needs.
- **The bulk bar's Delete** (.cr-bulk-bar button.destroy) was a solid dark-red block (!important). Now red words
  on the bar, like the rest of its buttons' outline family.
Left alone on purpose: crAsk's confirm button (the dialog's main action IS the delete), photo-tile x overlays
(hover-only tint, phones have no hover), Production/Dispatch/Punch (Theo excluded them at 1292), CRM-coloured
header + (semantic), the selected-state chips (a state, not an action)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""    <button id="delClientBtn" style="background:#C8202E;color:#fff;border:0;border-radius:9px;
      font:800 14px 'Segoe UI',Arial,sans-serif;padding:13px 26px;cursor:pointer;box-shadow:0 3px 10px rgba(200,32,46,.35);">""",
"""    <button id="delClientBtn" type="button">""")

one("""#dangerZone .danger-note{color:#a89f9a}""",
"""#dangerZone .danger-note{color:#a89f9a}
/* 1363 (Buttons A): Delete is red words with no fill, so it never looks like Save. The ink is per ground:
   pink on the dark grounds (Cardinal red is under the floor there), Cardinal red on the light ones. */
#delClientBtn{background:transparent;border:1px solid transparent;border-radius:var(--btn-rad,12px);box-shadow:none;
  color:#ff7b82;font:800 15px 'Segoe UI',Arial,sans-serif;padding:0 22px;cursor:pointer;}   /* its 44px is the 1206 rule's (.rvbtn,#delClientBtn) */
#delClientBtn:hover,#delClientBtn:focus-visible{border-color:currentColor;}
:root[data-theme="rb-light"] #delClientBtn{color:#c8202e;}
/* Insurance keeps its own theme (docket paper / siren black), whatever the app theme is */
body.claim-insurance #delClientBtn{color:#c8202e;}
body[data-rltheme="siren"].claim-insurance #delClientBtn{color:#ff7b82;}""")

one(""".cr-bulk-bar button.destroy{background:var(--red-dk) !important;border-color:var(--red-dk) !important;color:#fff !important}""",
""".cr-bulk-bar button.destroy{background:transparent !important;border-color:transparent !important;color:#ff7b82 !important}   /* 1363: Delete is red words */""")
one(""".cr-bulk-bar button.destroy:hover:not(:disabled){background:#7d1219 !important}""",
""".cr-bulk-bar button.destroy:hover:not(:disabled){background:transparent !important;border-color:#ff7b82 !important}""")

one(">v2026-10-17 build 1362<button", ">v2026-10-17 build 1363<button")
one("""  { b: 1362, d:'2026-10-17',""",
"""  { b: 1363, d:'2026-10-17', t:'Delete never looks like Save', s:'Delete Client was a solid red button, the same look as Save, on the one button you cannot undo. It is now red words with no fill, like every other Delete in the app. The Delete button on the bar that appears when you select several clients is the same now too.' },
  { b: 1362, d:'2026-10-17',""")
pl.write_atomic(path, s)
print('ok 1363')
