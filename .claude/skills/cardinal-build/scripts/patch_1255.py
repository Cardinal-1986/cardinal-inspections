#!/usr/bin/env python3
"""Build 1255 — the scheduled punch buzzes (Theo's pick 4C): the app half.

The server half is api/punch-buzz.js (hourly cron, Dayton time) and
punch_buzz_log.sql (applied). The buzzes carry two links this app did not
understand yet:
  #punch            the Punch List
  #route/<name>     that person's day route (1254), e.g. #route/scottie

1. The boot hash-scrub (613) rewrote any hash it did not recognise to '#h'
   before a later script could read it, so both are added to its allow-list.
2. cr-route-script opens them — on load once the user is signed in, and on
   hashchange (a tap on a buzz while the app is already open navigates the
   same document: no reload, so the boot restore never sees it).
3. The route page re-reads the punch rows when it opens, so a route opened
   from a buzz (or after a long while) is not drawn from a stale or empty list.

usage: python3 patch_1255.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '../../../../index.html')
src = pl.load(PATH)

# 1. the boot scrub keeps the two new links
src = pl.sub(src, "  try{ if(!/^#(p|e|list)\\//.test(location.hash) && !/type=recovery/.test(location.hash) && !/^#(leads|reports|clients|feed|audit|board|me|team|settings)/.test(location.hash)){ history.replaceState({ v:'home' }, '', '#h'); } }catch(e){}",
  "  /* 1255: #punch and #route/<name> are the punch buzzes' links — cr-route-script opens them.\n"
  "     STASHED here, because showHome() pushes #h before that script has even parsed. */\n"
  "  try{ if(/^#(punch$|route\\/)/.test(location.hash)) window.__crBootLink = location.hash; }catch(e){}\n"
  "  try{ if(!/^#(p|e|list)\\//.test(location.hash) && !/type=recovery/.test(location.hash) && !/^#(leads|reports|clients|feed|audit|board|me|team|settings)/.test(location.hash) && !/^#(punch$|route\\/)/.test(location.hash)){ history.replaceState({ v:'home' }, '', '#h'); } }catch(e){}")

# 2 + 3. the route module: refresh on open, and open the buzz links
src = pl.sub(src, '''  el.classList.add('open');
  el.scrollTop = 0;
  rtDraw();
  if(map) setTimeout(function(){ try{ map.invalidateSize(); }catch(_){} }, 60);
  if(typeof window.navSetView === 'function'){ try{ window.navSetView('route'); }catch(_){} }
}''', '''  el.classList.add('open');
  el.scrollTop = 0;
  rtDraw();
  /* 1255: re-read the rows — a route opened from a buzz must not be drawn from a stale list */
  var P = window.CardinalPunch;
  if(P && typeof P.reload === 'function'){ try{ P.reload().then(function(){ if(rtIsOpen()) rtDraw(); }, function(){}); }catch(_){} }
  if(map) setTimeout(function(){ try{ map.invalidateSize(); }catch(_){} }, 60);
  if(typeof window.navSetView === 'function'){ try{ window.navSetView('route'); }catch(_){} }
}''')
src = pl.sub(src, '''window.CardinalRoute = Object.assign(window.CardinalRoute || {}, { open: rtOpen, close: rtClose, isOpen: rtIsOpen, _days: rtDays });''',
'''/* 1255: the punch buzzes' links. #punch opens the Punch List; #route/<name>
   opens that person's route (names are the local part of a
   @cardinalrenovations.net address). Waits for a signed-in user, then puts the
   hash back to #h so a reload does not reopen it. */
var rtLinkT = null;
function rtLink(){
  var h = location.hash || '';
  if(window.__crBootLink){ h = window.__crBootLink; window.__crBootLink = ''; }   /* the link the app was opened with */
  var m = /^#route\\/([a-z0-9._-]+)$/i.exec(h);
  if(h !== '#punch' && !m) return;
  clearTimeout(rtLinkT);
  var tries = 0;
  (function rtLinkGo(){
    if(!(window.currentUser && typeof window.openPunchView === 'function')){
      if(++tries < 300) rtLinkT = setTimeout(rtLinkGo, 400);
      return;
    }
    try{ if(location.hash === h) history.replaceState(history.state, '', '#h'); }catch(_){}
    Promise.resolve(window.openPunchView()).then(function(){
      if(m) rtOpen(decodeURIComponent(m[1]).toLowerCase() + '@cardinalrenovations.net');
    }, function(){});
  })();
}
window.addEventListener('hashchange', rtLink);
rtLink();
window.CardinalRoute = Object.assign(window.CardinalRoute || {}, { open: rtOpen, close: rtClose, isOpen: rtIsOpen, _days: rtDays, _link: rtLink });''')

src = pl.sub(src, '>v2026-10-07 build 1254<', '>v2026-10-07 build 1255<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1255, d: '2026-10-07', t: 'The punch buzzes: the morning report, the 3pm plan, the 6pm list',
    s: 'The app now buzzes on its own, Monday to Saturday, Dayton time. <b>7am</b>: Theo gets the punch report \\u2014 today\\u2019s stops per person, what is past due, what needs follow-up, what is unassigned and what closed yesterday. Also at 7am, any job <b>2 days</b> past due buzzes Curtis and any job <b>5 days</b> past due buzzes Theo \\u2014 once per job, not every morning. <b>3pm</b>: Curtis gets \\u201cPlan Thursday\\u201d (or whatever the next working day is) with each person\\u2019s count and what is still unassigned or undated. <b>6pm</b>: everyone with stops tomorrow gets their list, and tapping it opens their day route. If someone has never turned on notifications, the buzz comes by email instead.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
