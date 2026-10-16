"""Build 1356 — Back goes where you were (Theo: "Sometimes when I hit the back button on my browser in chrome
it takes me to random places instead of where I was at.").
Reproduced in Chromium: Production → client A → Estimates → A/R → Sales Floor → client B → Schedule Board, then
Back ×N went Board → B → **A** (Sales Floor skipped and replaced by client A) → A/R → Estimates → A → Production.
Two causes, both in the main block's history code:
1. The tab memory (1037) replaceState's {v:'project', id: currentProject.id} on the CURRENT entry whenever a tab
   flips — but currentProject outlives the client page, so a tab flip fired while another screen was open
   rewrote THAT screen's entry as the last client. It now writes only when the current entry is this client.
2. navSetView replaced any entry that was not 'cardinal-nav' ("first app state"). That is right for the empty
   first entry and for the legacy {v:…} twin the same navigation just pushed (openProject & co. are wrapped by
   both systems), and wrong for every other legacy page — Team, a list, the editor, My Profile: opening
   Production from one of them overwrote it, so Back skipped it. It now replaces only those two cases.
3. The 1259 hashchange router re-opened whatever fragment Back landed on. navSetView entries keep the previous
   page's fragment, so Back onto Sales Floor (fragment #p/<client A>) opened client A over it. Back/Forward
   between the app's own entries is now ignored there (they all carry a state; an alert link's entry has none)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""    if(!__histLock && currentProject && pv && pv.style.display !== 'none' && prev && prev !== name){""",
"""    /* 1356: only rewrite the entry that IS this client. currentProject outlives the page, and a tab flip fired
       from another screen rewrote that screen's entry as the last client (Back then "went somewhere random"). */
    var _hs1356 = history.state, _cid1356 = currentProject && String(currentProject.id);
    var _onIt1356 = !!(_hs1356 && ((_hs1356.v === 'project' && String(_hs1356.id) === _cid1356) ||
      (_hs1356.app === 'cardinal-nav' && _hs1356.view === 'project' && _hs1356.data && String(_hs1356.data.projectId) === _cid1356)));
    if(!__histLock && currentProject && _onIt1356 && pv && pv.style.display !== 'none' && prev && prev !== name){""")

one("""    try{
      if(!cur || cur.app !== 'cardinal-nav'){
        /* first app state — replace the empty initial entry so back doesn't exit */
        history.replaceState(st, '');""",
"""    /* 1356: replace only the empty first entry, or the legacy {v:…} twin this same navigation just pushed
       (openProject & co. are wrapped by both systems). Any other legacy page — Team, a list, the editor — is a
       real place, and replacing it made Back skip it. */
    var _twin1356 = !!(cur && cur.app !== 'cardinal-nav' && cur.v && (cur.v === view || (cur.v === 'me' && view === 'profile')) &&
      (view !== 'project' || (data && String(cur.id) === String(data.projectId))));
    try{
      if(!cur || _twin1356){
        /* first app state — replace the empty initial entry so back doesn't exit */
        history.replaceState(st, '');""")
one("""  window.addEventListener('hashchange', function(){
    if(!currentUser || !__restorableHash()) return;""",
"""  window.addEventListener('hashchange', function(){
    if(!currentUser || !__restorableHash()) return;
    /* 1356: Back/Forward between two of the app's own entries DOES raise hashchange when their fragments
       differ (the comment above is wrong about that), and navSetView entries keep the previous page's
       fragment. So Back onto Sales Floor read "#p/<last client>" here and opened that client over it.
       The app's entries all carry a state; an alert link's fragment entry has none. */
    if(history.state) return;""")
one(">v2026-10-16 build 1355<button", ">v2026-10-16 build 1356<button")
one("""  { b: 1355, d:'2026-10-16',""",
"""  { b: 1356, d:'2026-10-16', t:'Back goes where you were', s:'The browser Back button could skip a screen and land on a client you had looked at earlier. Two things caused it: switching a tab on a client page could rewrite the history of the screen you were on, and opening a page like Production from Team, a list or the editor wiped that page out of your history. Back now walks the screens you visited, in order.' },
  { b: 1355, d:'2026-10-16',""")
pl.write_atomic(path, s)
print('ok 1356')
