"""Build 1365 — the installed app's bottom bar becomes ‹ Back · Home · Jobs · + · Schedule · Menu.
Theo, comparing a rep's old demo CRM: picked its five-button bottom bar (option 2: Home · Jobs · + · Schedule ·
Menu), approved the preview on the real app, then picked option 1 of the follow-up: EXTEND the installed app's
existing bar (#pwaNav — ‹ Back / › Forward) instead of adding a second one, and keep Back, because the installed
app has no browser back button.
Why extend: every bottom-of-screen control (estimate Save/Publish, signature pad, pay sheets, landing tiles, the
sheets 961/962 fixed) already clears #pwaNav by its ~64px constant. A second bar would have broken all of them.
The tabs are sized so the bar stays that height (6 + 50 + 6 + 1px border).
- Phone width (<=760px) in the installed app only. A browser tab and the iPad are unchanged.
- The header's + and menu move down into the bar (hidden in the header there); Forward and the Library button are
  dropped from the bar on a phone (the Library is in the menu). They stay in the markup, so nothing that names them
  breaks, and an iPad still has them.
- Each tab calls the SAME function its existing entrance calls: CardinalHeader.goHome(), openLeadsView(), openScheduleBoard(),
  and a .click() on the header's own + / menu buttons, whose menus are then opened from the bottom.
- The lit tab follows the screen you are on (Home / Jobs incl. a client page / Schedule); it only writes when the
  answer changes.
- A field user (1317) keeps Back, Home and Menu only.
- Self Check probes whichever + / menu / forward-or-Home is on screen, so it reports no phantom failure."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1. markup: five tabs after Back
one("""  <button id="pwaBack" aria-label="Back">&#8249;</button>
  <button id="pwaFwd" aria-label="Forward">&#8250;</button>""",
"""  <button id="pwaBack" aria-label="Back">&#8249;</button>
  <!-- 1365: the phone tab bar (Theo's pick). Each tab calls the existing entrance's own function. -->
  <button id="pwaHome" class="pwatab" data-tab="home" aria-label="Home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg><span>Home</span></button>
  <button id="pwaJobs" class="pwatab" data-tab="jobs" aria-label="Jobs"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg><span>Jobs</span></button>
  <button id="pwaNew" class="pwatab pwaplus" data-tab="new" aria-label="New"><b aria-hidden="true">+</b><span>New</span></button>
  <button id="pwaSched" class="pwatab" data-tab="sched" aria-label="Schedule"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14h3v3H8z"/></svg><span>Schedule</span></button>
  <button id="pwaMenu" class="pwatab" data-tab="menu" aria-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Menu</span></button>
  <button id="pwaFwd" aria-label="Forward">&#8250;</button>""")

# 2. styles
one("""body.standalone #editorView{padding-bottom:calc(64px + env(safe-area-inset-bottom));box-sizing:border-box;}""",
"""body.standalone #editorView{padding-bottom:calc(64px + env(safe-area-inset-bottom));box-sizing:border-box;}
/* 1365: the phone tab bar. Same bar, same ~64px height every clearance in this file is built on. */
#pwaNav .pwatab{--cr-stack:"1365 the tabs exist only on an installed phone; the round-button rule still serves Back and Forward";display:none}
@media (max-width:760px){
  body.standalone #pwaNav{--cr-stack:"1365 the tab row packs tighter than the two-arrow row the base rule still lays out for an iPad";
    justify-content:space-between;gap:2px;padding:6px max(6px, env(safe-area-inset-right)) calc(6px + env(safe-area-inset-bottom)) max(6px, env(safe-area-inset-left));}
  body.standalone #pwaNav .pwatab{--cr-stack:"1365 a labelled tab is not the round arrow button the base #pwaNav rule still draws for Back";
    display:flex;flex:1 1 0;min-width:0;width:auto;height:50px;border-radius:12px;border:0;background:transparent;padding:0;
    flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#bdb4aa;font:600 11px/1 'Segoe UI',Arial,sans-serif;}
  body.standalone #pwaNav .pwatab svg{width:22px;height:22px;display:block}
  body.standalone #pwaNav .pwatab.on{color:#ffffff}
  body.standalone #pwaNav .pwatab.on svg{color:#ff7b82}
  body.standalone #pwaNav .pwatab:active{transform:scale(.94);background:rgba(255,255,255,.06)}
  body.standalone #pwaNav .pwaplus{color:#ffffff}
  body.standalone #pwaNav .pwaplus b{display:flex;align-items:center;justify-content:center;width:44px;height:30px;border-radius:10px;
    background:#c8202e;color:#fff;font:400 24px/1 'Segoe UI',Arial,sans-serif}
  body.standalone #pwaNav #pwaBack{--cr-stack:"1365 Back shrinks to make room for five tabs";flex:0 0 40px;width:40px;height:40px;font-size:24px}
  body.standalone #pwaNav #pwaFwd,body.standalone #pwaNav #pwaLib{--cr-stack:"1365 Forward and the Library leave the phone bar (the Library is in the menu); an iPad keeps both";display:none !important}
  /* the header's + and menu live in the bar now */
  body.standalone header.site #cr-hd2-bar #navBtn,body.standalone header.site #cr-hd2-bar #addProjectBtn{--cr-stack:"1365 on an installed phone + and menu move into the bottom bar";display:none !important}
  body.standalone.cr-tb-menu #cr-ai-fab{visibility:hidden}
  /* a field user (1317) keeps Back, Home and Menu */
  body.standalone.cr-field #pwaNav #pwaJobs,body.standalone.cr-field #pwaNav #pwaNew,body.standalone.cr-field #pwaNav #pwaSched{display:none !important}
}""")

# 3. behaviour
one("""<script id="cr-pnc-script">""",
"""<script id="cr-pwatab-script">
/* 1365: the phone tab bar's taps and its lit tab. No observer: the lit tab is recomputed after a tap anywhere and
   on Back/Forward, and is written only when it changes. */
(function(){
  'use strict';
  function tbShown(id){
    var e = document.getElementById(id);
    if(!e || e.style.display === 'none') return false;
    try{ return getComputedStyle(e).display !== 'none'; }catch(_){ return false; }
  }
  function tbWhich(){
    if(tbShown('boardView')) return 'sched';
    if(tbShown('leadsView') || tbShown('projectView') || tbShown('clientsView')) return 'jobs';
    if(tbShown('mainView')) return 'home';
    return '';
  }
  var lit = null;
  function tbPaint(){
    var k = tbWhich();
    if(k === lit) return;
    lit = k;
    var tabs = document.querySelectorAll('#pwaNav .pwatab');
    for(var i = 0; i < tabs.length; i++){
      var on = tabs[i].getAttribute('data-tab') === k;
      tabs[i].classList.toggle('on', on);
      if(on) tabs[i].setAttribute('aria-current', 'page'); else tabs[i].removeAttribute('aria-current');
    }
  }
  /* the header's menus drop from the header; opened from the bar they rise from the bar instead */
  function rise(menu){
    if(!menu || menu.style.display !== 'block') return;
    var nav = document.getElementById('pwaNav');
    var h = nav ? nav.getBoundingClientRect().height : 64;
    menu.style.top = 'auto';
    menu.style.bottom = Math.round(h + 8) + 'px';
    menu.style.maxHeight = Math.max(200, window.innerHeight - h - 80) + 'px';
    /* the menu lives inside the header's stacking layer (z 90), so no z-index lifts it over the floating Ask
       button (9400); Ask steps aside while the menu is up and comes back the moment it closes */
    document.body.classList.add('cr-tb-menu');
    var tbOff = function(){ setTimeout(function(){
      if(menu.style.display !== 'block'){ document.body.classList.remove('cr-tb-menu'); document.removeEventListener('click', tbOff, true); }
    }, 0); };
    document.addEventListener('click', tbOff, true);
  }
  document.addEventListener('click', function(e){
    var b = (e.target instanceof Element) ? e.target.closest('#pwaNav .pwatab') : null;
    if(!b){ setTimeout(tbPaint, 120); return; }
    e.preventDefault(); e.stopPropagation();
    var k = b.getAttribute('data-tab'), w = /** @type {any} */ (window);
    try{
      if(k === 'home'){ var H = w.CardinalHeader; if(H && typeof H.goHome === 'function') H.goHome(); else if(typeof w.showHome === 'function') w.showHome(); }   /* goHome lives inside the header module */
      else if(k === 'jobs'){ if(typeof w.openLeadsView === 'function') w.openLeadsView(); }
      else if(k === 'sched'){ if(typeof w.openScheduleBoard === 'function') w.openScheduleBoard(); }
      else if(k === 'new'){ var a = document.getElementById('addProjectBtn'); if(a){ a.click(); rise(document.getElementById('newMenu')); } }
      else if(k === 'menu'){ var m = document.getElementById('navBtn'); if(m) m.click(); }
    }catch(err){ try{ if(w.report) w.report(err, 'Navigation', 'bottom bar'); }catch(_){} }
    setTimeout(tbPaint, 60);
  }, true);
  window.addEventListener('popstate', function(){ setTimeout(tbPaint, 120); });
  window.addEventListener('hashchange', function(){ setTimeout(tbPaint, 120); });
  setTimeout(tbPaint, 1500);
  window.CardinalTabBar = Object.assign(window.CardinalTabBar || {}, { paint: tbPaint, which: tbWhich });
})();
</script>
<script id="cr-pnc-script">""")

# 4. Self Check probes the control that is on screen
one("""['#cr-hd2-home', 'home (banner)'], ['#addProjectBtn', 'add (+)'], ['#navBtn', 'menu'],""",
    """['#cr-hd2-home', 'home (banner)'], ['#addProjectBtn, #pwaNew', 'add (+)'], ['#navBtn, #pwaMenu', 'menu'],   /* 1365: header or bar */""")
one("""['#pwaFwd',  'PWA forward arrow'],""", """['#pwaFwd, #pwaHome',  'PWA forward arrow (Home tab on a phone)'],   /* 1365 */""")

one(">v2026-10-17 build 1364<button", ">v2026-10-18 build 1365<button")
one("""  { b: 1364, d:'2026-10-17',""",
"""  { b: 1365, d:'2026-10-18', t:'A bottom bar on the phone', s:'In the installed app on a phone, the bar along the bottom now has Back, Home, Jobs, a red + for something new, Schedule and Menu, all under your thumb. The + and the menu moved down from the top. The button for the screen you are on lights up. Back still works the way it always did. On an iPad or in a browser nothing changes.' },
  { b: 1364, d:'2026-10-17',""")
pl.write_atomic(path, s)
print('ok 1365')
