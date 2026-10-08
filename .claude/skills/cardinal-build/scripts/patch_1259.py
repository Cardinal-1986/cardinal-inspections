#!/usr/bin/env python3
"""Build 1259 — tapping an alert opens the job, even when the app is already open.

Found at 1255, fixed here on Theo's "Yes" (7 Oct). Two faults, one symptom:

1. sw.js resolved the alert's link against ITSELF. The links are relative —
   '#p/<id>/punch' (1125), '#p/<id>' (1147), '#punch' / '#route/<name>' (1255).
   WindowClient.navigate() and clients.openWindow() parse a relative URL against
   the SERVICE WORKER's base URL, so '#p/123/punch' became /sw.js#p/123/punch:
   a tap on a push opened the raw service-worker script, not the app. The link
   is now resolved against the registration's scope (the app's root).
2. With the app already open, that navigation only changes the fragment — no
   reload — and nothing listened for it: __tryRestoreFromHash runs once, at
   sign-in. A hashchange listener now re-runs the SAME restore (the one that has
   handled #p/<id>/<tab> since 613) for a signed-in user. #punch and #route/<name>
   were already handled by cr-route-script (1255).

usage: python3 patch_1259.py [index.html] [sw.js]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
SW = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '../../../../sw.js')

# 1. sw.js
sw = pl.load(SW)
sw = pl.sub(sw, """  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(list){""",
"""  var url = (e.notification.data && e.notification.data.url) || '/';
  /* 1259: resolve against the APP's root. navigate() and openWindow() parse a
     relative URL against this worker's own address, so '#p/123/punch' (1125) and
     '#route/scottie' (1255) opened /sw.js#… — the raw script, not the app. */
  try{ url = new URL(url, self.registration.scope).href; }catch(_u){ url = self.registration.scope; }
  e.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(list){""")
pl.write_atomic(SW, sw)

# 2. index.html — re-run the restore when the hash changes under an open app
src = pl.load(PATH)
src = pl.sub(src, """  function __restorableHash(){
    return /^#(p|e|list)\\//.test(location.hash) || /^#(leads|reports|clients|feed|audit|board|me|team|settings)/.test(location.hash);
  }
""", """  function __restorableHash(){
    return /^#(p|e|list)\\//.test(location.hash) || /^#(leads|reports|clients|feed|audit|board|me|team|settings)/.test(location.hash);
  }
  /* 1259: an alert tapped while the app is OPEN only changes the fragment — no
     reload — so the restore above, which runs once at sign-in, never saw it.
     Re-run the same restore. The app's own navigation never fires this: it moves
     with pushState / replaceState, which do not raise hashchange. */
  window.addEventListener('hashchange', function(){
    if(!currentUser || !__restorableHash()) return;
    __restored = false; __restoreTries = 0;
    setTimeout(window.__tryRestoreFromHash, 0);
  });
""")
src = pl.sub(src, '>v2026-10-07 build 1258<', '>v2026-10-07 build 1259<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1259, d: '2026-10-07', t: 'Tapping an alert opens the job',
    s: 'Tapping a push alert about a punch-out or a client now opens that job. Before, it could open a page of code instead of the app, and if the app was already open it simply stayed where it was. Both are fixed, for the punch-out alerts and the new evening lists alike.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src), SW, len(sw))
