"""Build 1299 — the reds that were the APP's, found by running every gate (Theo, 11 Oct:
"do 3 ... don't stop till it's fixed to your standards").

A full sweep of all 379 gates and the harnesses against main. Most reds were the
TESTS' fault (pinned to punctuation an approved build moved) and are fixed in the
tests. These are the ones that were the app's:

  1. A punch-out / client / alert LINK opened cold landed on Home, not the job.
     Since 1165 sign-in calls showHome(), whose history wrapper pushes #h, and the
     hash restore runs 60ms later -- so it read "#h" and restored nothing. Every
     #p/<id>(/tab) link sent since 30 Aug opened the home screen unless the app was
     already open. The boot hash is now stashed at parse time (the 1255 pattern for
     #punch) and the restore reads it until it has actually restored.
  2. The left rail's "Switch portal" row lost Theo's yellow (539) and its light
     amber (1035): 1165 renamed the label, the rail keys data-k off the label, and
     both rules still said data-k="landing". Retargeted -- same row, same colours.
  3. One native alert() survived 1080 (the CompanyCam job link save error).
  4. One native confirm() survived 1083 -- "Place a LIVE order with ABC Supply?"
     -- and three modules carried a private confirm() fallback for crAsk. The
     fallbacks now DECLINE (a destructive question with no sheet to ask it on is
     answered no), so crAsk's own module is the only place the browser box lives.
  5. MINE, from 1292: the outline Cancel / Not now / Close on the white form
     sheets was 1.22:1 in dark mode -- light ink on a see-through chip on white.
  6. MINE, from 1287/1290: the one-typeface rule also restyled Production and the
     dispatch board, which Theo had said are left alone. Excluded, as 1289 did for
     the presentation screens.

Usage: python3 patch_1299.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

# ── 1 · the boot hash survives showHome()'s #h
A = """  var __restored = false, __restoreTries = 0;
  window.__tryRestoreFromHash = function(){
    if(__restored) return;
    var h = location.hash || '';"""
B = """  var __restored = false, __restoreTries = 0;
  /* 1299: since 1165 sign-in lands on showHome(), and the wrapper above makes
     that push #h BEFORE this restore runs (60ms after showMain). So a cold open
     of #p/<id>/punch -- the punch-out text, a client link, an alert -- read "#h"
     here and restored nothing: the job link opened Home. The fragment is taken
     NOW, at parse time, the way 1255 already stashes #punch / #route, and is
     used until a restore has actually happened (the project retry loop below
     re-enters this function, so it must not be consumed on the first pass). */
  var __restoreBootHash = null;
  try{ if(/^#(p|e|list)\\//.test(location.hash) || /^#(leads|reports|clients|feed|audit|board|me|team|settings)/.test(location.hash)) __restoreBootHash = location.hash; }catch(e){}
  window.__tryRestoreFromHash = function(){
    if(__restored) return;
    var h = location.hash || '';
    if(__restoreBootHash && (h === '' || h === '#h')) h = __restoreBootHash;"""
src = pl.sub(src, A, B)
A = """    if(!st){ __restored = true; document.body.classList.remove('restoring'); return; }"""
B = """    if(!st){ __restored = true; __restoreBootHash = null; document.body.classList.remove('restoring'); return; }"""
src = pl.sub(src, A, B)
A = """    __restored = true;
    __histLock = true;
    try{
      if(st.v === 'project'){"""
B = """    __restored = true; __restoreBootHash = null;
    __histLock = true;
    try{
      if(st.v === 'project'){"""
src = pl.sub(src, A, B)

# ── 2 · the Switch portal row keeps its colour
A = """:root:not([data-theme="rb-light"]) #cr-lnav .lnav-item[data-k="landing"] .lnav-tx{color:#f0c651}"""
B = """:root:not([data-theme="rb-light"]) #cr-lnav .lnav-item[data-k="switchportal"] .lnav-tx{color:#f0c651}  /* 1299: was data-k="landing"; 1165 renamed the row's label to "Switch portal" and data-k follows the label, so this matched nothing for 130 builds */"""
src = pl.sub(src, A, B)
A = """:root[data-theme="rb-light"] #cr-lnav .lnav-item[data-k="landing"] .lnav-tx{color:#8a6100}"""
B = """:root[data-theme="rb-light"] #cr-lnav .lnav-item[data-k="switchportal"] .lnav-tx{color:#8a6100}"""
src = pl.sub(src, A, B)

# ── 3 · the last native alert()
A = """    }catch(err){ b.removeAttribute('disabled'); alert('Could not save the link: ' + (err.message || err)); return; }"""
B = """    }catch(err){ b.removeAttribute('disabled'); crTell('Could not save the link: ' + (err.message || err)); return; }   /* 1299: the one alert() 1080 missed */"""
src = pl.sub(src, A, B)

# ── 4 · the last native confirm() and the three private fallbacks
A = """  if(!isTest() && !window.confirm('Place a LIVE order with ABC Supply?\\n\\nThis puts real materials on a truck and bills Cardinal.')) return;"""
B = """  /* 1299: the one confirm() 1083 missed -- and the most consequential question in
     the app. Same sheet as every other "are you sure"; the verb says what it does. */
  if(!isTest() && !(await window.crAsk('Place a LIVE order with ABC Supply?\\n\\nThis puts real materials on a truck and bills Cardinal.', { verb:'Place order' }))) return;"""
src = pl.sub(src, A, B)
FALLBACK = "function(m){ return Promise.resolve(confirm(m)); }"
DECLINE = "function(){ return Promise.resolve(false); /* 1299: no sheet, no destructive yes -- crAsk's module owns the browser box */ }"
assert src.count(FALLBACK) == 3, src.count(FALLBACK)
src = src.replace(FALLBACK, DECLINE)

# ── 5 · MY 1292 REGRESSION: the outline Cancel on a WHITE form sheet
# 1292 (Buttons A) made the dark .chipbtn transparent. Its ink is #e6e9ee, and
# the form sheets (.projform — Add project, checklist, gutter calc, lead, the
# calendar's appointment sheet) are white in BOTH themes by decision (Forms 1).
# So Cancel / Not now / Close / Cancel edit went to 1.22:1 — present, invisible.
# Before 1292 the chip carried its own #1b1b22 fill, which is why it read.
A = """:root:not([data-theme="rb-light"]) .chipbtn:hover{border-color:var(--red);color:#ff7b82;}"""
B = """:root:not([data-theme="rb-light"]) .chipbtn:hover{border-color:var(--red);color:#ff7b82;}
/* 1299: a chip on the WHITE form sheet keeps paper ink. The sheet is white in both
   themes (Forms 1), so the dark rule above — light ink on a transparent chip since
   1292 — read 1.22:1 there. Outline style is unchanged: no fill, a hairline, ink. */
:root:not([data-theme="rb-light"]) .projform .chipbtn{--cr-stack:"1299 the form sheet is white in dark too (Forms 1); 1292's light chip ink is for dark grounds";color:#2b2b2b;border-color:#c9c2b8;background:transparent;}
:root:not([data-theme="rb-light"]) .projform .chipbtn:hover{border-color:var(--red);color:#9c1822;}
:root:not([data-theme="rb-light"]) .projform .chipbtn.danger{color:#c8202e;border-color:transparent;}"""
src = pl.sub(src, A, B)

# ── 6 · MY 1287/1290 OVERREACH: the one-typeface rule reached Production and Dispatch
# Theo's standing call is that Production and the dispatch board are LEFT ALONE
# (1288 says so in its own banner). 1287's universal font rule excluded the drawer
# and, from 1289, the presentation screens -- but not #cr-pb or #cr-disp, so the
# Magnet Board's uppercase mono dog tags (948) went to Segoe. gate_948 caught it.
OLD_X = ":not(:is(#cr-why,#cr-occ,#cr-show,#cr-appt)):not(:is(#cr-why,#cr-occ,#cr-show,#cr-appt) *){"
NEW_X = ":not(:is(#cr-why,#cr-occ,#cr-show,#cr-appt,#cr-pb,#cr-disp)):not(:is(#cr-why,#cr-occ,#cr-show,#cr-appt,#cr-pb,#cr-disp) *){"
assert src.count(OLD_X) == 2, src.count(OLD_X)
src = src.replace(OLD_X, NEW_X)
src = pl.sub(src, '--cr-stack:"1287 one sans across dark retail; the drawer and (1289) the client-facing presentation screens — Why, Colors, Showcase, Appointment — are excluded";',
                  '--cr-stack:"1287 one sans across dark retail; the drawer, (1289) the client-facing presentation screens — Why, Colors, Showcase, Appointment — and (1299) Production and Dispatch, which are left alone, are excluded";')
src = pl.sub(src, '--cr-stack:"1290 one sans across light retail; drawer + presentation screens excluded";',
                  '--cr-stack:"1290 one sans across light retail; drawer, presentation screens and (1299) Production + Dispatch excluded";')

# ── stamp + changelog
A = ">v2026-10-11 build 1298<button"
B = ">v2026-10-11 build 1299<button"
src = pl.sub(src, A, B)
A = "var CHANGELOG = [\n"
B = """var CHANGELOG = [
  { b: 1299, d: '2026-10-11', t: 'Job links open the job again',
    s: 'Every check in the app was run, and the ones that failed because of the app are fixed here. The big one: a link to a job \\u2014 the punch-out text Curtis gets, a client link, an alert \\u2014 opened the home screen instead of the job whenever the app was not already open, since the change that made signing in go straight to your home (30 Aug). The address is now read before anything can change it, so the link lands on the right client and the right tab. Also: the Switch portal row on the desktop rail has its yellow back (the rename had quietly dropped it); the CompanyCam job-link error and the \\u201cPlace a LIVE order with ABC Supply?\\u201d question use the app\\u2019s own message and question sheet instead of the phone\\u2019s grey box; three delete questions no longer fall back to the grey box if the sheet is ever missing \\u2014 they simply do not delete; and the Cancel / Not now / Close buttons on the white forms (Add project, the checklist, the gutter calculator, the lead form, the calendar\\u2019s appointment sheet) are readable in dark mode again \\u2014 my button change last night had made them white on white. And Production and the dispatch board get their own lettering back (the crew name tags in capitals) \\u2014 the one-typeface change was not meant to reach them.' },
"""
src = pl.sub(src, A, B)

pl.write_atomic(PATH, src)
print('patched', PATH)
