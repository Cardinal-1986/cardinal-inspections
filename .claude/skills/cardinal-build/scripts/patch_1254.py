#!/usr/bin/env python3
"""Build 1254 — a person's day route (Theo's pick 2C, free version).

Theo, 7 Oct: "Scottie has no idea what to do tomorrow." 2C was picked from the
preview; on 7 Oct he chose the FREE version first: straight-line order and
estimated minutes, no paid directions service ("real drive times can be added
later in one build").

New module cr-route (#cr-route, window.CardinalRoute.open(email, dayKey)):
  * a day strip — today and the next five working days, Sunday skipped, each
    with that person's stop count;
  * the map (the app's Leaflet + OSM tiles, the shop at 5735 Webster St as "C",
    stops numbered in route order, a dashed line between them);
  * "N past due, not on this route" — that person's open jobs dated before
    today and not on site; Theo, Joan and Curtis get "Add to <day>" (the 1252
    bosses — moving a day is dispatch);
  * the timeline: leave the shop, each stop with its time (or none), the client,
    the kind and what is wrong, and "≈ N min · M mi" between stops; tap a stop
    and THE card opens; "Directions in Google Maps" hands the whole run off.

Order: timed stops by time, then the untimed ones nearest-first from wherever
the run is. Minutes are an ESTIMATE — straight-line miles × 1.3 for roads at
30 mph — and always printed with "≈". Geocoding reuses the punch map's own
resolver and 'geo:' cache, now exported as window.CardinalPunchGeo, so there is
one geocoder, not two. Addresses that will not resolve are listed, not dropped.

Entry: a "Routes" row of crew chips on the Punch List (everyone with open work).
Registered in hideAllViews (class-shown, closes through its own close) and in
navRestore. No scroll-lock writer (overscroll-behavior:contain), no body observer.

usage: python3 patch_1254.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '../../../../index.html')
src = pl.load(PATH)

# ── 1. the punch map shares its geocoder ──
src = pl.sub(src, '''  window.CardinalPunchMap = Object.assign(window.CardinalPunchMap || {}, {
    refresh: function(){ evaluate(); },
    _sync: sync, _mode: function(m){ if(m){ mode=m; recolor(); } return mode; }
  });
})();
</script>
''', '''  window.CardinalPunchMap = Object.assign(window.CardinalPunchMap || {}, {
    refresh: function(){ evaluate(); },
    _sync: sync, _mode: function(m){ if(m){ mode=m; recolor(); } return mode; }
  });
  /* 1254: one geocoder for the app's punch maps — the route page asks this one
     (Google first, Nominatim on a miss, the shared 'geo:' cache) rather than
     growing a second. */
  window.CardinalPunchGeo = Object.assign(window.CardinalPunchGeo || {}, {
    resolve: function(addr, cb){ if(!addr){ cb(null); return; } resolve(addr, cb); },
    cached: cachedGeo,
    miles: havMi
  });
})();
</script>
''' + open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'route_1254.html'), encoding='utf-8').read())

# ── 2. the Punch List: a Routes row of crew chips ──
src = pl.sub(src, '''    <div class="pu-lay">
      <aside class="pu-rail-wrap"><div class="pu-rail" id="puRail"></div></aside>''',
'''    <div class="pl-routes" id="puRoutes"></div>
    <div class="pu-lay">
      <aside class="pu-rail-wrap"><div class="pu-rail" id="puRail"></div></aside>''')
src = pl.sub(src, '''  document.getElementById('puRail').innerHTML = rail;
''', '''  document.getElementById('puRail').innerHTML = rail;

  /* 1254: Routes — one chip per person with open work, to their day route */
  var rtEl = document.getElementById('puRoutes');
  if(rtEl){
    var rtCrew = crew.filter(function(w){ return open.some(function(it){ return it.assigned_to === w; }); });
    rtEl.innerHTML = rtCrew.length ? '<span class="pl-rtl">Routes</span>' + rtCrew.map(function(w){
      return '<button type="button" class="pl-rtc" data-puroute="' + esc(w) + '"><span class="pl-av">' +
        esc(plName(w).slice(0, 2).toUpperCase()) + '</span>' + esc(plName(w)) + '</button>';
    }).join('') : '';
  }
''')
src = pl.sub(src, '''  var ty = e.target.closest('#punchView [data-putype]');''', '''  var rt = e.target.closest('#punchView [data-puroute]');
  if(rt){ if(window.CardinalRoute && window.CardinalRoute.open) window.CardinalRoute.open(rt.getAttribute('data-puroute')); return; }
  var ty = e.target.closest('#punchView [data-putype]');''')
src = pl.sub(src, '''.pl-back{justify-content:flex-start;gap:8px;margin:0 0 6px;}''', '''.pl-back{justify-content:flex-start;gap:8px;margin:0 0 6px;}
/* 1254: the Routes row */
.pl-routes{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px;}
.pl-routes:empty{display:none;}
.pl-rtl{font:700 11px ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--rbe-mute);}
.pl-rtc{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px 0 8px;border-radius:999px;cursor:pointer;
  border:1px solid var(--rbe-line);background:var(--rbe-panel);color:var(--rbe-ink);font:600 13px 'Segoe UI',Arial,sans-serif;}''')

# ── 3. navigation: hideAllViews + navRestore ──
src = pl.sub(src, '''   { id:'cr-pk', api:window.CardinalPunchCard },
   { id:'cr-show', api:window.CardinalShowcase },''', '''   { id:'cr-pk', api:window.CardinalPunchCard },
   /* 1254: the day route — class-shown, closes through its own close(false) */
   { id:'cr-route', api:window.CardinalRoute },
   { id:'cr-show', api:window.CardinalShowcase },''')
src = pl.sub(src, '''        case 'punchcard':       if(window.CardinalPunchCard && window.__crPunchCardLast)
                                  window.CardinalPunchCard.open(window.__crPunchCardLast); break;''',
'''        case 'punchcard':       if(window.CardinalPunchCard && window.__crPunchCardLast)
                                  window.CardinalPunchCard.open(window.__crPunchCardLast); break;
        case 'route':           if(window.CardinalRoute && window.__crRouteLast)
                                  window.CardinalRoute.open(window.__crRouteLast.who, window.__crRouteLast.day); break;   /* 1254 */''')

# ── 4. stamp + changelog ──
src = pl.sub(src, '>v2026-10-07 build 1253<', '>v2026-10-07 build 1254<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1254, d: '2026-10-07', t: 'A day route for each person',
    s: 'The Punch List has a Routes row: tap Scottie (or anyone with open work) to see his day on a map \\u2014 the shop, each stop numbered in order, and the line between them. Below the map: when he leaves, each stop with its time, the client and what needs doing, and roughly how many minutes and miles between stops. Pick tomorrow or any day this week from the strip at the top. Jobs he has that are past due and not on the route are listed first, and Theo, Joan and Curtis can add one to the day with a tap. Drive times are estimates for now (straight-line distance, marked \\u2248); the Directions button opens the whole run in Google Maps.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
