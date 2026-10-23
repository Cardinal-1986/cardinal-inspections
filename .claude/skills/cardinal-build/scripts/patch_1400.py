"""Build 1400 — a production day, driven tap by tap (23 Oct 2026 audit, round 4).
1. Production reopening the app with a saved session landed on the RETAIL home (pipeline dollars, A/R):
   showMain() called CardinalProduction.open(), which parses ~250 ms later, so the guard fell to the
   retail home. showMain / showLanding / goToLanding now leave a pending flag and cr-pb opens the board
   the moment it is defined.
2. A field user tapping "Open job" or a build-day row was stranded on a blank retail shell: the board (or
   punch card) closed itself before openProject() refused him. For a field user it no longer closes.
3. The punch card's Call button dialled nothing: projPhone() returns {digits, pretty}, not a string.
4. Back with the board's day sheet or + Add sheet open left the sheet over whatever came next. Closing the
   board (Back or close()) closes both.
5. Closing a punch-out while checked in left the visit open ("On site since…" kept counting). Closing
   stamps the open visit's check-out first.
6. After "Tell Curtis it's finished", Check out asked the crew "Not finished yet. Tell Curtis it needs another
   day?" — a Yes contradicted the finish. No prompt once the latest flag is the finish request.
7. A refused move to Completed (missing install photos) was still written to the audit log as done.
8. Back while the install-photos sheet was open moved the page and left the sheet up; Back closes it.
9. A work order Curtis issues printed "No labor rates recorded for this crew yet." (crew_rates RLS returns []
   for production, not an error) instead of 555's "Labor pricing is handled by the office". The rate read is
   admin-only now, so production gets the intended line."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1
one("""  if(typeof isProductionUser === 'function' && isProductionUser() &&
     window.CardinalProduction && typeof window.CardinalProduction.open === 'function'){
    try{ var _plv""",
"""  /* 1400: cr-pb parses after this runs on a warm start — leave a note it picks up when it is defined */
  if(typeof isProductionUser === 'function' && isProductionUser() && !window.CardinalProduction) window.__crProdPending = 1;
  if(typeof isProductionUser === 'function' && isProductionUser() &&
     window.CardinalProduction && typeof window.CardinalProduction.open === 'function'){
    try{ var _plv""")
one("""  var _landed = false;
  if(typeof isProductionUser === 'function' && isProductionUser() &&""",
"""  var _landed = false;
  if(typeof isProductionUser === 'function' && isProductionUser() && !window.CardinalProduction) window.__crProdPending = 1;   /* 1400 */
  if(typeof isProductionUser === 'function' && isProductionUser() &&""")
one("""function showLanding(userEmail){
  if((typeof isFieldUser === 'function' && isFieldUser()) && window.CardinalProduction""",
"""function showLanding(userEmail){
  if((typeof isFieldUser === 'function' && isFieldUser()) && !window.CardinalProduction) window.__crProdPending = 1;   /* 1400 */
  if((typeof isFieldUser === 'function' && isFieldUser()) && window.CardinalProduction""")
one("""function goToLanding(){
  if((typeof isFieldUser === 'function' && isFieldUser()) && window.CardinalProduction""",
"""function goToLanding(){
  if((typeof isFieldUser === 'function' && isFieldUser()) && !window.CardinalProduction) window.__crProdPending = 1;   /* 1400 */
  if((typeof isFieldUser === 'function' && isFieldUser()) && window.CardinalProduction""")
one("""  refresh   : async function(){ await load(); lastSig = ''; render(); },
  openCount : function(){ return punchRows().filter(function(i){ return i.status === 'open'; }).length; },
};
})();""",
"""  refresh   : async function(){ await load(); lastSig = ''; render(); },
  openCount : function(){ return punchRows().filter(function(i){ return i.status === 'open'; }).length; },
};
/* 1400: showMain() ran before this module existed — open the board now, unless something else is already up */
if(window.__crProdPending){
  window.__crProdPending = 0;
  try{ if(!(window.currentProject && document.getElementById('projectView') && getComputedStyle(document.getElementById('projectView')).display !== 'none')) open(); }catch(_){}
}
})();""")

# 2
one("""      var id = b.getAttribute('data-job');
      if(!id) return;
      close(false);
      if(typeof window.openProject === 'function') window.openProject(id);""",
"""      var id = b.getAttribute('data-job');
      if(!id) return;
      /* 1400: a field user's openProject refuses — closing first stranded him on a blank shell */
      if(!(window.isFieldUser && window.isFieldUser())) close(false);
      if(typeof window.openProject === 'function') window.openProject(id);""")
one("""    var pid = it.project_id;
    close(false);                                   /* openProject does the navigating */
    if(typeof window.openProject === 'function') window.openProject(pid);""",
"""    var pid = it.project_id;
    if(!(window.isFieldUser && window.isFieldUser())) close(false);   /* openProject does the navigating; 1400: not for a field user, whom it refuses */
    if(typeof window.openProject === 'function') window.openProject(pid);""")
# 3
one("""  if(pr && typeof window.projPhone === 'function'){ try{ phone = window.projPhone(pr) || ''; }catch(_){} }""",
    """  /* 1400: projPhone() returns { digits, pretty } — String() of it was "[object Object]", so tel: dialled nothing */
  if(pr && typeof window.projPhone === 'function'){ try{ var _ph = window.projPhone(pr); phone = (_ph && typeof _ph === 'object') ? (_ph.digits || '') : (_ph || ''); }catch(_){} }""")
# 4
one("""  if(v !== 'production' && el && el.classList.contains('open')){
    el.classList.remove('open');
    document.body.style.overflow = '';
  }
});""",
"""  if(v !== 'production' && el && el.classList.contains('open')){
    el.classList.remove('open');
    document.body.style.overflow = '';
    try{ closeDay(); }catch(_){} try{ closeAdd(); }catch(_){}   /* 1400: the sheets went on showing over the next screen */
  }
});""")
one("""function close(goHome){
  if(el) el.classList.remove('open');
  document.body.style.overflow = '';
  if(goHome === false) return;""", """function close(goHome){
  try{ closeDay(); }catch(_){} try{ closeAdd(); }catch(_){}   /* 1400 */
  if(el) el.classList.remove('open');
  document.body.style.overflow = '';
  if(goHome === false) return;""")
# 5
one("""async function doToggle(){
  try{
    var P = window.CardinalPunch;""",
"""async function doToggle(){
  try{
    /* 1400: closing while checked in left the visit open and counting — stamp the check-out first */
    var _ov = it.status !== 'done' ? openVisit() : null;
    if(_ov){ var _vv = visits().slice(); _vv[_ov.i] = Object.assign({}, _ov.v, { out: new Date().toISOString() }); await save({ visits: _vv }); }
    var P = window.CardinalPunch;""")
# 6
one("""  var needDay = false;
  if(it.status !== 'done'){""",
"""  var needDay = false;
  /* 1400: the crew already said it is finished (askclose) — do not ask whether it needs another day */
  var _flags = comments().filter(function(c){ return c && c.flag; });
  var _askedClose = !!(_flags.length && _flags[_flags.length - 1].flag === 'askclose');
  if(it.status !== 'done' && !_askedClose){""")
# 7
one("""    var out = await _ss.apply(this, arguments);
    try{
      var nm = pr ? pr.name : '';""",
"""    var out = await _ss.apply(this, arguments);
    if(out === false) return out;   /* 1400: a refused move (install photos missing) is not a stage change */
    try{
      var nm = pr ? pr.name : '';""")
# 8
one("""  function inClose(){ var m = inQ('cr-inst-sheet'); if(m) m.classList.remove('open'); inPending = null; }""",
"""  function inClose(){ var m = inQ('cr-inst-sheet'); if(m) m.classList.remove('open'); inPending = null; }
  /* 1400: Back moved the page underneath and left the sheet up */
  window.addEventListener('popstate', function(){ var m = inQ('cr-inst-sheet'); if(m && m.classList.contains('open')) inClose(); });""")
# 9
one("""    var rates = null, catalog = {};
    try{
      var rr = await sb.from('crew_rates').select('*').eq('crew_id', crew.id);""",
"""    var rates = null, catalog = {};
    /* 1400: RLS answers production with [] (not an error), which printed "No labor rates recorded" on the
       crew's copy. Only the admin reads rates; everyone else gets 555's "handled by the office". */
    if(typeof isAdminUser === 'function' && isAdminUser()) try{
      var rr = await sb.from('crew_rates').select('*').eq('crew_id', crew.id);""")

one(">v2026-10-23 build 1399<", ">v2026-10-23 build 1400<")
one("""  { b: 1399, d:'2026-10-23',""",
"""  { b: 1400, d:'2026-10-23', t:'Fixes from a day on Production', s:'Production opens on the Production board again when the app reopens (it could land on the sales home). For the crew, Open job no longer leaves them on a blank screen, and the punch card\\u2019s Call button dials the client. Back closes the board\\u2019s day sheet, + Add sheet and the install-photos sheet instead of leaving them on screen. Closing a punch-out while checked in checks you out. After telling Curtis a job is finished, checking out no longer asks whether it needs another day. A blocked move to Completed is no longer logged as done. Work orders from Production say labor pricing is handled by the office.' },
  { b: 1399, d:'2026-10-23',""")
pl.write_atomic(path, s)
print('ok 1400')
