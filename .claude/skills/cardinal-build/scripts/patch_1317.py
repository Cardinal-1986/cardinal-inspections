"""Build 1317 — Scottie stays in Production (Theo: "Scottie stays only in productions and
can't go anywhere else" / "I don't want to complicate things for Scottie, he's never at a
desk"). Part 1 of 2: the app. Part 2 is the database (a field role, SQL first).

A FIELD user (FIELD_EMAILS — Scottie only; Curtis keeps everything he has) sees Production
and nothing else:
  * every way home lands on the Production hub: showHome, showLanding, goToLanding (no
    Front Door on top), and the back button (navRestore keeps only production, dispatch,
    punch list, punch card and route)
  * client profiles do not open (they carry Balance Due and every money tab); the job's
    address, phone and directions are on the punch card already
  * the header Front Door, the CRM switcher, the section banner, both searches, + New,
    the Ctrl-K palette and the desktop rail are off
  * the menu keeps Production Board, Crew Dispatch, Punch List and Notifications (plus
    Sign out); the hub's Crews tile (crew pay and rates) is off
Body class `cr-field`, toggled at sign-in beside `cr-prod`. CSS rules carry --cr-stack.
Usage: python3 patch_1317.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)
def one(old, new):
    global src
    assert src.count(old) == 1, (old[:100], src.count(old))
    src = src.replace(old, new)

FG = "(typeof isFieldUser === 'function' && isFieldUser())"
WFG = "(window.isFieldUser && window.isFieldUser())"

one("""function isProductionUser(){ return TEAM && currentUser && PRODUCTION_EMAILS.indexOf(currentUser.email) !== -1; }""",
"""function isProductionUser(){ return TEAM && currentUser && PRODUCTION_EMAILS.indexOf(currentUser.email) !== -1; }
/* 1317: a FIELD user works Production and nothing else — Theo, 11 Oct: "Scottie stays only in
   productions and can't go anywhere else". Curtis is production but not field: he keeps
   everything he has. This is the app half; the database half is a field role in RLS. */
var FIELD_EMAILS = ['scottie@cardinalrenovations.net'];
function isFieldUser(){ return !!(TEAM && currentUser && FIELD_EMAILS.indexOf(String(currentUser.email || '').toLowerCase()) !== -1); }
window.isFieldUser = isFieldUser;""")
one("""  try{ document.body.classList.toggle('cr-prod', typeof isProductionUser === 'function' && !!isProductionUser()); }catch(_cp){}""",
"""  try{ document.body.classList.toggle('cr-prod', typeof isProductionUser === 'function' && !!isProductionUser()); }catch(_cp){}
  try{ document.body.classList.toggle('cr-field', """ + FG + """); }catch(_cf){}   /* 1317 */""")
# every way home → Production
HOME = """  if(""" + FG + """ && window.CardinalProduction && typeof window.CardinalProduction.open === 'function'){ window.CardinalProduction.open(); return; }   /* 1317: field users live in Production */
"""
one("""function showHome(){
""", """function showHome(){
""" + HOME)
one("""function showLanding(userEmail){
""", """function showLanding(userEmail){
""" + HOME)
one("""function goToLanding(){
""", """function goToLanding(){
""" + HOME)
one("""function openProject(id){
  var pr = cacheProjects.find(function(x){ return x.id === id; });""",
"""function openProject(id){
  /* 1317: a client profile carries Balance Due and every money tab. A field user's job
     details — address, phone, directions — are on the punch card. */
  if(""" + FG + """){ try{ crTell('The job\\u2019s address, phone and directions are on its punch card.'); }catch(_){} return; }
  var pr = cacheProjects.find(function(x){ return x.id === id; });""")
one("""    __histLock = true;
    try{
      switch(state.view){""",
"""    __histLock = true;
    try{
      /* 1317: the back button cannot walk a field user out of Production */
      if(""" + FG + """ && ['production', 'dispatch', 'punchcard', 'route', 'punch'].indexOf(state.view) === -1){
        state = { app: state.app, view: 'production', data: null };
      }
      switch(state.view){""")
# Front Door
one("""function open(){
  ensureView();
  render();  /* fresh counts and quote on every open */
  q('cr-fd').classList.add('open');""",
"""function open(){
  if(""" + WFG + """) return;   /* 1317: no portal picker for a field user */
  ensureView();
  render();  /* fresh counts and quote on every open */
  q('cr-fd').classList.add('open');""")
one("""function go(d){
  close();
  try{ if(window.CardinalPortal""",
"""function go(d){
  close();
  if(""" + WFG + """) return;   /* 1317 */
  try{ if(window.CardinalPortal""")
# palette
one("""if((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')){
e.preventDefault();
if(visible) close(); else open();""",
"""if((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')){
e.preventDefault();
if(""" + WFG + """) return;   /* 1317 */
if(visible) close(); else open();""")
# rail
one("""function on(){ return window.matchMedia('(min-width:' + W + 'px)').matches; }""",
"""function on(){ if(""" + WFG + """) return false; /* 1317 */ return window.matchMedia('(min-width:' + W + 'px)').matches; }""")
# hub Crews tile
one("""      else if(h === 'crews' && window.CardinalCrews && window.CardinalCrews.open){ close(false); window.CardinalCrews.open(); }""",
"""      else if(h === 'crews' && !""" + WFG + """ && window.CardinalCrews && window.CardinalCrews.open){ close(false); window.CardinalCrews.open(); }   /* 1317: crew pay is not a field screen */""")
# the hub's own Back listener closes it on any non-production state; a field user's Back was
# redirected to production by navRestore and then shut by this — keep it open for them
one("""window.addEventListener('popstate', function(ev){
  var v = ev.state && ev.state.view;
  if(v !== 'production' && el && el.classList.contains('open')){""",
"""window.addEventListener('popstate', function(ev){
  var v = ev.state && ev.state.view;
  /* 1317: navRestore sends a field user's Back to production; do not shut the hub behind it */
  if(window.isFieldUser && window.isFieldUser() && ['dispatch', 'punchcard', 'route', 'punch'].indexOf(v) === -1) return;
  if(v !== 'production' && el && el.classList.contains('open')){""")
# the older hash router (non cardinal-nav states) can open the directory, reports, a profile…
one("""    if(e.state && e.state.app === 'cardinal-nav') return;
    var st = e.state || { v:'home' };""",
"""    if(e.state && e.state.app === 'cardinal-nav') return;
    /* 1317: none of the old hash-router views are field screens */
    if(window.isFieldUser && window.isFieldUser()){ if(window.CardinalProduction && window.CardinalProduction.open) window.CardinalProduction.open(); return; }
    var st = e.state || { v:'home' };""")
# the drawer folds every section shut by default; with the headers hidden a field user could
# never open them — give a field user one flat list instead
one("""      if(!isDrawer() || railWidth()){
        applying = true; try{ clearSections(); }catch(_){ } applying = false; return;""",
"""      if(!isDrawer() || railWidth() || (window.isFieldUser && window.isFieldUser())){   /* 1317: a field user's few rows are one flat list */
        applying = true; try{ clearSections(); }catch(_){ } applying = false; return;""")
# CSS
one("""/* 1042 (audit F4): for production accounts the punch page joins the""",
"""/* 1317: a field user (Scottie) works Production and nothing else. Every door out is closed in
   code as well (showHome, openProject, navRestore, the Front Door); these rules take the
   doors off the screen so there is nothing to tap that does nothing. */
body.cr-field #crBanner, body.cr-field #cbCrm, body.cr-field #cbSearch, body.cr-field #headSearch,
body.cr-field #newWrap, body.cr-field #cr-lnav, body.cr-field .pbnavbtn[data-hub="crews"],
body.cr-field #navMenu .navsec{ --cr-stack:"1317 field user: Production only"; display:none !important; }
body.cr-field #navMenu .navopt:not([data-nav="prodboard"]):not([data-nav="dispatch"]):not([data-nav="punch"]):not([data-nav="notify"]){
  --cr-stack:"1317 field user: Production only"; display:none !important; }
body.cr-field #brandTitle{ --cr-stack:"1317 field user: no portal picker"; pointer-events:none; }
/* 1042 (audit F4): for production accounts the punch page joins the""")

one(">v2026-10-11 build 1316<button", ">v2026-10-11 build 1317<button")
one("var CHANGELOG = [", """var CHANGELOG = [
  { b: 1317, d:'2026-10-11', t:'Scottie stays in Production', s:'Scottie\\u2019s app now opens on Production and stays there: the menu shows only the Production Board, Crew Dispatch, Punch List and Notifications, the portal picker, search, + New and the section bar are gone, and the back button can\\u2019t walk out. Client profiles don\\u2019t open for him \\u2014 the address, phone and directions are on each job\\u2019s punch card \\u2014 and the crew pay screen is off. Curtis keeps everything he has.' },""")
pl.write_atomic(PATH, src)
print('1317 applied')
