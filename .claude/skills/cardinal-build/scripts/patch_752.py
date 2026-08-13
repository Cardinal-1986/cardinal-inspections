# -*- coding: utf-8 -*-
"""Build 752 — 44px touch targets, everywhere the walk measured a miss.

   Theo: "Minimum 44px touch target on every clickable element" — scope 3,
   everything measured, picked by number after the seven-screen walk.

   METHOD: ONE late <style id="cr-touch44-styles"> block, appended at the end of
   <body>, carrying the ENTIRE pass. Not an override layer in the retail-B sense
   (no colours, no design, no !important) — a single accessibility floor whose
   census IS the block, so the partial-theming trap ("13 of 14 fixed reads as
   done") cannot happen: one block, one census, one gate.

   ⚠️ WHY min-width/min-height AND NOT width/height. The controls are sized by
   id-scoped rules this block could not out-specify from a class selector
   (#calCard .calnav{width:32px}, #leadsView .ljbtn{width:38px},
   #cr-hd2-bar .cr-ib.menu{width:38px}). But min-* are DIFFERENT PROPERTIES —
   they do not compete in the cascade with width/height at all; the used value
   is max(width, min-width). So a plain-class min rule beats an id-scoped width
   without touching a single module stylesheet. That is what makes a one-block
   pass possible.

   ⚠️ THE AUDIT'S OWN BLIND SPOT, found during recon: `.pu-box` (the punch tick
   on the home Today band) measured 22×22 and looked like an offender — but it
   ALREADY carries `::after{width:44px;height:44px}` centred on it. A pseudo
   -element extends the HIT AREA without extending getBoundingClientRect, so a
   rect-based audit CANNOT see it. pu-box is correct, is NOT touched, and is the
   in-app precedent for the pattern. Recorded in the census below so nobody
   "fixes" it into a 44px visible square.

   ⚠️ WHAT IS DELIBERATELY NOT TOUCHED:
     - Printed documents. They render inside the #reportFrame iframe — a separate
       document that app CSS cannot reach. The 15px contract tick boxes print,
       and stay 15px. Asserted.
     - `.pu-box` (above).
     - Photo Activity tiles: 155×155, already over the floor.

   Every rule below carries its measured BEFORE size from walk751 (390px,
   touch, rendered rects), so the census is evidence, not intention.
"""
import sys, re
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

SRC = '/home/user/cardinal-inspections/index.html'
src = pl.load(SRC)
orig = src

CSS = """
<style id="cr-touch44-styles">
/* ============================================================================
   cr-touch44 — the 44px touch-target floor · v2026-08-12 build 752
   ONE block is the WHOLE pass. Every selector lists its measured size at 390px
   before this build (walk751.mjs, rendered rects, touch context). If you add a
   control under 44px, its fix belongs HERE, with its measurement.
   min-* only: min-width/min-height do not compete with width/height in the
   cascade, so the id-scoped sizes in module stylesheets stay untouched.
   NOT here on purpose: .pu-box (already has a 44px ::after hit area — a rect
   audit cannot see it, do not "fix" it), document tick boxes (iframe, prints),
   photo tiles (155px).
   ========================================================================== */

/* ---- chrome, on every screen ------------------------------------------- */
/* was 38×38 (menu) / 34×34 (+) — the header icon buttons */
.cr-ib{min-width:44px;min-height:44px;}
/* was 34×34 */
#cr-hd2-home{min-width:44px;min-height:44px;}
/* was 32×40 */
#cr-home-btn{min-width:44px;min-height:44px;}
/* was 30×30 — landing light/dark toggle */
.cr-lr-theme{min-width:44px;min-height:44px;}
/* was 42×21 ("Skip") and 97×40 ("All clients · N") — landing recents module */
button.sk{min-height:44px;min-width:44px;}
.cr-lr-minor button{min-height:44px;}

/* ---- burger menu -------------------------------------------------------- */
/* was 33–34 tall, all 16 items */
#newMenu .navopt,#navMenu .navopt{min-height:44px;}

/* ---- home --------------------------------------------------------------- */
/* was 106×29 ×60 — the Call/Text pills on every client card */
.pcacts a{min-height:44px;display:inline-flex;align-items:center;justify-content:center;}
/* was 28×28 (home) / 32×32 (#calCard, .teamcal) — calendar arrows */
.calnav{min-width:44px;min-height:44px;}

/* ---- All Clients list --------------------------------------------------- */
/* was 36×36 base, 38×38 in #leadsView — fifteen on screen at once */
.ljbtn{min-width:44px;min-height:44px;}
/* was 32 tall — stage filter chips */
.ljchip{min-height:44px;}
/* was 87×20 — the shortest control in the app */
.ljsortchip{min-height:44px;display:inline-flex;align-items:center;}

/* ---- client profile ----------------------------------------------------- */
/* was 12–14 tall — email, phone, Add contact, Switch Primary */
a.hem,a.hph,#dbAddContact,#dbSwitchPrim{display:inline-flex;align-items:center;min-height:44px;}
/* was 30×26 — the edit pencil */
.editpencil{min-width:44px;min-height:44px;}
/* was 45×24 — Map/Satellite toggles on the location cards (profile + leads) */
.dbmtabs button,.ljmaptabs button{min-height:44px;}

/* ---- chip buttons, app-wide (money actions included) -------------------- */
/* was 34–40 tall: ＋ Add, See all, Remove, Mark repaid, ‹ Overview, cover 📷 */
.chipbtn{min-height:44px;min-width:44px;}
/* was 38 tall — Mark Paid / Pay net / Pay full / Confirm */
.pay-btn,.pay-chip{min-height:44px;}
/* was 139×36 — ＋ Add a punch out. NOT a .chipbtn, its own class; the first
   gate run caught the census assuming otherwise. */
.pp-add{min-height:44px;}

/* ---- form controls in the app document ---------------------------------- */
/* was 31 tall (Activity Count and friends). Printed documents are in the
   #reportFrame iframe and cannot inherit this. */
select{min-height:44px;}
</style>
"""

# census count used by the gate: one min-height per rule group
RULES = CSS.count('min-height:44px')
assert '`' not in CSS  # habit from BUG_CLASSES 38, harmless here (not a template literal)

# ── splice: end of <body>, AFTER the last script, BEFORE the real close ──────
tail = '</script>\n</body>\n</html>'
assert src.count(tail) == 1, 'tail anchor not unique (%d)' % src.count(tail)
src = src.replace(tail, '</script>\n' + CSS.strip() + '\n</body>\n</html>')

# ── stamp + changelog ────────────────────────────────────────────────────────
olds = ("v2026-08-12 build 751 &#8212; Tapping a photo in the gallery opens the photo full screen instead of "
        "jumping to the client")
news = ("v2026-08-12 build 752 &#8212; Every button, chip and link is at least 44 pixels to the touch — "
        "the size a gloved finger needs")
assert src.count(olds) == 1, 'app stamp anchor'
src = src.replace(olds, news)

oldc = "var CHANGELOG = [\n{ b:751,"
newc = ("var CHANGELOG = [\n"
        "{ b:752, d:'2026-08-12', t:'Buttons a gloved finger can hit',\n"
        "s:'Every screen was measured at phone width, and everything that came up under 44 pixels \\u2014 the "
        "size a fingertip actually needs \\u2014 got raised to the floor. The menu button, the plus, the home "
        "button, all sixteen menu items, the Call and Text buttons on every client card, the calendar arrows, "
        "the fifteen action buttons on the client list, the stage filter chips, the sort control, the email and "
        "phone links on a profile that were twelve pixels tall, the edit pencil, the Map and Satellite toggles, "
        "every chip button including Mark Paid and Mark Repaid, and every dropdown. Photo thumbnails were "
        "already big enough and printed documents are untouched \\u2014 contracts print exactly as before.' },\n"
        "{ b:751,")
assert src.count(oldc) == 1, 'changelog anchor'
src = src.replace(oldc, newc)

assert src != orig
pl.write_atomic(SRC, src)
print('PATCH OK — %d min-height rules in the block' % RULES)

# ── self-checks ──────────────────────────────────────────────────────────────
assert src.count('<style id="cr-touch44-styles">') == 1
assert src.count('<style') == orig.count('<style') + 1
assert src.count('</style>') == orig.count('</style>') + 1

# the block must be the LAST stylesheet in the document, or the whole
# same-specificity strategy silently loses to later module blocks.
assert src.rfind('<style') == src.rfind('<style id="cr-touch44-styles">'), \
    'cr-touch44 must be the final <style> block'

# printed documents untouched — the skeleton's own tick-box rule survives
assert src.count('.cbx{cursor:pointer;font-size:13pt;user-select:none;}') == 1
# module stylesheets untouched: every pre-existing sizing rule still present
for keep in ['#calCard .calnav{width:32px;height:32px;font-size:18px;}',
             '#leadsView .ljbtn{']:
    assert keep in src, 'module rule disturbed: ' + keep[:40]
# pu-box left alone
# COUNT THE RULE OPENINGS, NOT THE NAME: this block's own census comment says
# '.pu-box' twice in prose, so a bare name count moved by my own documentation.
# Comment pollution, the file's oldest counting trap, in its newest block.
assert src.count('.pu-box{') == orig.count('.pu-box{'), 'a pu-box RULE was added or removed'
assert src.count('.pu-box:') == orig.count('.pu-box:'), 'a pu-box pseudo rule moved'
# no javascript in this build at all
assert src.count('<script') == orig.count('<script')

for tok in ['build 752 &#8212;', '{ b:752,']:
    assert tok in src, 'missing ' + tok
print('ALL SELF-CHECKS PASS')
