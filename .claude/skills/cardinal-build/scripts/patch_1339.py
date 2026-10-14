"""Build 1339 — the light/dark switch is back in the header bar (Theo: "please bring back the light dark
theme"). Since 1230 it lived only in the phone menu drawer, which a desktop never opens, so on a desktop
there was no way to switch at all; on a phone it sat at the bottom of the drawer. It now sits in the
header bar beside + on every portal, phone and desktop, as a drawn sun/moon (not an emoji). It never
floats, so 1230's reason for moving it (it covered tiles and prices) still holds. The drawer row stays.
Also: apply() wrote the glyph every second whether or not it changed — each write is a mutation that
wakes every body observer. It now writes only on a change."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1 — glyph: drawn icons, written only when the state changes
one("""var btn = document.getElementById('cr-dark-toggle');
/* 1181: on insurance the glyph reads the INSURANCE theme — a sun that never
   changes while the screen does is exactly the "control that lies" the 694
   note below refuses to ship. */
var lit = inInsurancePortal() ? insLight() : isLight();
if(btn) btn.textContent = lit ? '\\u2600' : '\\uD83C\\uDF19';
paintAppear(lit);""",
"""var btn = document.getElementById('cr-dark-toggle');
/* 1181: on insurance the glyph reads the INSURANCE theme — a sun that never
   changes while the screen does is exactly the "control that lies" the 694
   note below refuses to ship. */
var lit = inInsurancePortal() ? insLight() : isLight();
paintGlyph(btn, lit);
paintAppear(lit);""")
one("""/* 1230: the drawer's Appearance row. Same dispatch as the button: retail and""",
"""/* 1339: drawn icons, like every other header control since 686. The icon shows what a tap WILL
   do (a sun on a dark screen means "go light"), and the label says it in words. Written ONLY when
   the state changes: apply() rides a 1s sweep, and assigning content emits a mutation even when it
   is identical, which wakes every document.body observer (the 567/569 lesson). */
var SUN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>';
var MOON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>';
function paintGlyph(btn, lit){
  if(!btn) return;
  var want = lit ? 'light' : 'dark';
  if(btn.getAttribute('data-lit') === want) return;
  btn.setAttribute('data-lit', want);
  btn.innerHTML = lit ? MOON : SUN;
  var say = lit ? 'Switch to dark' : 'Switch to light';
  btn.setAttribute('aria-label', say);
  btn.title = say;
}
/* 1230: the drawer's Appearance row. Same dispatch as the button: retail and""")
one("""btn.title = 'Switch retail theme (dark / light)';
btn.setAttribute('aria-label', 'Switch retail theme');
btn.textContent = isLight() ? '\\u2600' : '\\uD83C\\uDF19';
btn.onclick = toggle;""",
"""paintGlyph(btn, inInsurancePortal() ? insLight() : isLight());   /* 1339 */
btn.onclick = toggle;""")

# 2 — placement: the header bar, beside +
one("""var crm = document.body.dataset.crm;
var row = document.getElementById('cr-hd2-srch');
if(needsFloat()){""",
"""/* 1339 (Theo: "please bring back the light dark theme"). Since 1230 the switch lived only in the
   menu drawer, and a desktop never opens that drawer (it has the left nav), so on a desktop there
   was no way to switch at all; on a phone it was at the bottom of the drawer. It now sits IN the
   header bar beside +, every portal, every width. It never floats, so 1230's reason for taking it
   out of the corner (it covered tiles, prices and tables) still holds. The client-facing Blackout
   screens still hide it: the switch does nothing there. */
var bar = document.getElementById('cr-hd2-bar');
if(bar){
  if(blackoutUp()){ if(btn.classList.contains('show')) btn.classList.remove('show'); return; }
  if(btn.parentNode !== bar){
    /* between + and Search: + carries the margin that holds the right-hand group over (1176) */
    var lens = document.getElementById('cr-hd2-lens');
    if(lens && lens.parentNode === bar) bar.insertBefore(btn, lens); else bar.appendChild(btn);
  }
  if(btn.classList.contains('afloat')) btn.classList.remove('afloat');
  if(!btn.classList.contains('cr-ib')) btn.classList.add('cr-ib');
  if(!btn.classList.contains('show')) btn.classList.add('show');
  return;
}
var crm = document.body.dataset.crm;
var row = document.getElementById('cr-hd2-srch');
if(needsFloat()){""")

# 3 — style: a header button like + and Search, in the bar's own colours
one("""@media print{#cr-dark-toggle{display:none !important}}</style>""",
"""@media print{#cr-dark-toggle{display:none !important}}
/* 1339: in the header bar it is one of the bar's own buttons, not the old floating disc. The bar
   places by `order`, not DOM position: + is 8, Search is 10, so this is 9. */
#cr-hd2-bar #cr-dark-toggle{order:9;position:static;inset:auto;z-index:auto;box-shadow:none;transition:none;
  background:transparent;color:var(--hmt,#6b6357);border-color:var(--hln,#ddd6cf);
  --cr-stack:"the floating disc's fixed position and its light-mode white fill must not apply inside the bar"}
#cr-hd2-bar #cr-dark-toggle:not(.show){display:none;--cr-stack:"inside the bar the bar's own .cr-ib display:flex outranks the base hide, so a Blackout screen could not hide it without this"}
#cr-hd2-bar #cr-dark-toggle:hover{transform:none;border-color:var(--hac,#c8202e);color:var(--hac,#c8202e)}
#cr-hd2-bar #cr-dark-toggle:active{transform:none}</style>""")

# 4 — the 417 search-row adopter must not pull it back out of the bar (it runs from a body
#     observer, so the two would hand the button back and forth forever)
one("""if(dark && dark.parentNode !== row && !dark.classList.contains('afloat')) row.appendChild(dark);""",
"""if(dark && dark.parentNode !== row && !dark.classList.contains('afloat')
   && !(dark.parentNode && dark.parentNode.id === 'cr-hd2-bar')) row.appendChild(dark);   /* 1339: the bar is its home now */""")
# 5 — the phone gallery rule was for the floating disc; the header button is not on the album
one("""#cr-dark-toggle.show:not(#cr-hd2-srch #cr-dark-toggle){display:none} }""",
"""#cr-dark-toggle.show:not(#cr-hd2-srch #cr-dark-toggle):not(#cr-hd2-bar #cr-dark-toggle){display:none} }""")

# stamp + changelog
assert s.count('>v2026-10-14 build 1338<button') == 1
s = s.replace('>v2026-10-14 build 1338<button', '>v2026-10-14 build 1339<button', 1)
one("{ b: 1338, d:'2026-10-14',",
"""{ b: 1339, d:'2026-10-14', t:'The light and dark switch is back on screen', s:'There is a sun and moon button in the top bar again, next to +. Tap it to switch between dark and light. It is there on the phone and on a computer, in Retail, Insurance and Community. Before, it was only in the phone menu under Appearance, so on a computer there was no way to switch at all. The Appearance row in the menu still works too.' },
  { b: 1338, d:'2026-10-14',""")
pl.write_atomic(path, s)
print('1339 applied')
