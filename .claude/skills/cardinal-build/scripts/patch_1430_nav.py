#!/usr/bin/env python3
"""patch_G.py <in.html> <out.html> — Builder G, round-1 audit items #7, #11, #16, #17, #22, #23, #24.

Exact-match surgery through patch_lib (every anchor asserted once, nothing
written on a miss, atomic write). Re-runnable: applying it to the same input
twice produces byte-identical output, and the edits are walked in file order.

    #7   + New on the Production board, Punch & Repairs and Crew Dispatch
    #11  Escape / Back close the topmost pop-up sheet (ONE mechanism, 1341's grown)
    #22  the Schedule Board day sheet (and every sheet) closes when you navigate
    #23  the Undo message clears the installed tab bar
    #16  Switch portal keeps your place · the Front Door closes (✕, Escape) ·
         drawer counts count what you can see · Tools hides doors a rep can't use
    #17  a field account's way into a job is its punch card; empty headings hidden;
         Dispatch is a Production screen
    #24  light-mode rail icons for Clients / Estimates / Pricing are their own glyphs
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

if len(sys.argv) != 3:
    print(__doc__); sys.exit(2)
SRC, OUT = sys.argv[1], sys.argv[2]
s = pl.load(SRC)
orig = s
EDITS = []   # (label, old, new) — applied in order, each asserted == 1


def edit(label, old, new):
    EDITS.append((label, old, new))


# ════════════════════════════════════════════════════════════════════════════
# #7 — + New over the full-screen production views
# ════════════════════════════════════════════════════════════════════════════
# 7a. #newMenu's own z-index. Inside the header it never applied (header.site
#     #newMenu{z-index:95} wins there, and the header is a z-90 stacking layer);
#     it only decides anything once the menu sits at <body> level (7c), where it
#     must clear the board (9500), Dispatch (9550) and the board's sheets (9600).
edit('7a newMenu z',
"#newMenu{\n  position:fixed;z-index:120;",
"#newMenu{\n  /* 1430 (audit #7): 9700, not 120. Inside the header this never applied (the header's own\n     rule wins there); it decides only once the bar's + New lifts the menu to <body> (cr-pwatab\n     rise()), where it must clear the Production board (9500), Crew Dispatch (9550) and the\n     board's sheets (9600). Below #pwaNav's 9990 and every toast/question layer. */\n  position:fixed;z-index:9700;")

# 7b. the forms + New opens sit at 200-225 — under those views. Lift them while one is up.
edit('7b lift forms over the production views',
"#newMenu .navopt + .navopt{border-top:1px solid #eee;}\n",
"#newMenu .navopt + .navopt{border-top:1px solid #eee;}\n"
"/* 1430 (audit #7): + New's forms (Contact, Task, Lead) sit at z 200-225, so over the Production\n"
"   board (9500), Crew Dispatch (9550) and a production account's Punch & Repairs (9400) they opened\n"
"   UNDER the screen and the tap did nothing visible. While one of those views is up they lift over\n"
"   it. Everything they open themselves (the address list 10700, questions 99990, toasts 99999,\n"
"   Record payment 12000) still sits above 9700. */\n"
"body:has(#cr-pb.open) :is(#projModal,#apptModal,#leadFormModal),\n"
"body:has(#cr-disp.open) :is(#projModal,#apptModal,#leadFormModal),\n"
"body.cr-prod:has(#punchView:not([style*=\"none\"])) :is(#projModal,#apptModal,#leadFormModal){z-index:9700 !important;}\n")

# 7c. Task from + New must not tear the board down for the retail home (money).
edit('7c helper',
"/* ---------- +New menu ---------- */\nvar newMenu = document.getElementById('newMenu');",
r"""/* ---------- +New menu ---------- */
/* 1430 (audit #7): the full-screen production views + New can be tapped over. */
function crFsOverlayOpen(){
  var pb = document.getElementById('cr-pb'); if(pb && pb.classList.contains('open')) return true;
  var dp = document.getElementById('cr-disp'); if(dp && dp.classList.contains('open')) return true;
  var pv = document.getElementById('punchView');
  return !!(pv && document.body.classList.contains('cr-prod') && pv.style.display !== 'none' && getComputedStyle(pv).display !== 'none');
}
var newMenu = document.getElementById('newMenu');""")

edit('7c task keeps the screen',
"  else if(kind === 'task'){\n    var t = new Date();\n    if(mainView.style.display === 'none') showHome();",
"  else if(kind === 'task'){\n    var t = new Date();\n"
"    /* 1430 (audit #7): over the Production board, Dispatch or the punch page the sheet opens IN\n"
"       PLACE — showHome() tore the board down and put a production account on the retail home\n"
"       (pipeline, AR money). The sheet needs nothing from home: openApptDay() only fills itself. */\n"
"    if(mainView.style.display === 'none' && !crFsOverlayOpen() && !(typeof isProductionUser === 'function' && isProductionUser())) showHome();")


# ════════════════════════════════════════════════════════════════════════════
# #11 + #22 — ONE mechanism for pop-up sheets (Escape, Back, navigating)
# ════════════════════════════════════════════════════════════════════════════
OLD_1341 = """  /* 1341 (audit #5): the client form and the signature pad are not in history, so Back changed the
     screen BEHIND them and left them open over the wrong one. Back now closes the open one through its
     own Cancel and steps forward again, so you stay where you were (the forward pop restores it). */
  function crOpenFormCancel(){
    var pairs = [['projModal', 'pfCancel'], ['sigModal', 'sigCancel']];
    for(var i = 0; i < pairs.length; i++){
      var m = document.getElementById(pairs[i][0]);
      if(m && getComputedStyle(m).display !== 'none') return document.getElementById(pairs[i][1]);
    }
    return null;
  }
  window.addEventListener('popstate', function(e){
    var c = crOpenFormCancel();
    if(c){ try{ c.click(); }catch(_e){} try{ history.forward(); }catch(_e2){} return; }
    if(e.state && e.state.app === 'cardinal-nav'){
      navRestore(e.state);
    }
  });
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape' || e.defaultPrevented) return;
    var c = crOpenFormCancel(); if(c){ e.preventDefault(); c.click(); }
  });
"""
NEW_1341 = r"""  /* 1341 (audit #5): the client form and the signature pad are not in history, so Back changed the
     screen BEHIND them and left them open over the wrong one. Back now closes the open one through its
     own Cancel and steps forward again, so you stay where you were.

     1430 (audit #11, #22): ONE mechanism for every pop-up sheet, grown out of 1341's. 1341 named two
     forms; every other sheet ignored both keys — with Record payment open, Escape did nothing and Back
     moved the page underneath to Home while the sheet stayed on top. A list of names is the trap 1116
     named for the header: a new sheet is unhandled until somebody remembers to add it. So a sheet is
     recognised by what it IS:

         a direct child of <body>, position:fixed, laid out over the whole screen, with a translucent
         scrim — its own ground, or a full-size child's (Record payment's backdrop).

     Full-screen VIEWS are opaque, so they never match and keep their own Back (hideAllViews() /
     navRestore()). The topmost sheet is the highest z-index. It is closed the way a person would:
     1341's named Cancel, else the sheet's own Cancel / Close / x, else a tap on its scrim.

     Escape: a window CAPTURE listener notes the top sheet before anything else runs; a window BUBBLE
     listener closes it only if it is still there — crAsk, the palette and the sheets with their own
     Escape keep doing it, and nothing is closed twice.
     Back: the same Escape, synthesised. If the top sheet went away (or a question now sits over it)
     the pop is swallowed and the step undone with history.forward(), whose own pop is swallowed too,
     so the page underneath never moves or re-renders. This is the FIRST popstate listener in the file;
     stopImmediatePropagation() keeps the board's and the legacy router's listeners off a Back that
     only closed a sheet.
     Navigating (#22): a bottom-tab or drawer-row tap closes every open sheet first. */
  var CR_SHEET_CANCEL = { projModal: 'pfCancel', sigModal: 'sigCancel' };   /* 1341's pair, kept first */
  var crEntrySheet = null;
  function crAlpha(c){
    c = String(c || '');
    if(c === 'transparent') return 0;
    var m = /rgba?\(([^)]*)\)/.exec(c);
    if(m){ var p = m[1].split(/[\s,\/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; }
    m = /\/\s*([\d.]+)(%?)\s*\)/.exec(c);
    if(m) return m[2] ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
    return 1;
  }
  function crScrimOf(el){
    var vw = window.innerWidth, vh = window.innerHeight;
    var tr = function(n){ var a = crAlpha(getComputedStyle(n).backgroundColor); return a >= 0.12 && a <= 0.97; };
    if(tr(el)) return el;
    for(var i = 0; i < el.children.length && i < 3; i++){
      var k = el.children[i], r = k.getBoundingClientRect();
      if(r.width >= vw * 0.85 && r.height >= vh * 0.85 && tr(k)) return k;
    }
    return null;
  }
  function crIsSheet(el){
    if(!el || el.parentNode !== document.body || el.style.display === 'none') return false;
    if(el.id === 'navBackdrop'){ var dm = document.getElementById('navMenu'); if(!dm || dm.style.display !== 'block') return false; }   /* it fades a frame late */
    var cs = getComputedStyle(el);
    if(cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' ||
       cs.pointerEvents === 'none' || parseFloat(cs.opacity) < 0.5) return false;
    var r = el.getBoundingClientRect();
    if(r.width < window.innerWidth * 0.85 || r.height < window.innerHeight * 0.85) return false;
    return !!crScrimOf(el);
  }
  function crSheets(){
    var out = [], k = document.body ? document.body.children : [];
    for(var i = 0; i < k.length; i++){
      var el = k[i];
      if(el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') continue;
      if(!crIsSheet(el)) continue;
      var z = parseInt(getComputedStyle(el).zIndex, 10);
      out.push({ el: el, z: isNaN(z) ? 0 : z, i: i });
    }
    out.sort(function(a, b){ return (b.z - a.z) || (b.i - a.i); });
    return out.map(function(o){ return o.el; });
  }
  function crTopSheet(){ return crSheets()[0] || null; }
  function crSheetCloser(el, tried){
    var id = CR_SHEET_CANCEL[el.id], c = id ? document.getElementById(id) : null;
    if(c && c.getClientRects().length && tried.indexOf(c) === -1) return c;
    var tiers = [[], [], [], []];
    var all = el.querySelectorAll('button,[role="button"],[data-close],[data-dayclose]');
    for(var i = 0; i < all.length; i++){
      var n = /** @type {HTMLButtonElement} */ (all[i]);
      if(tried.indexOf(n) !== -1 || n.disabled || !n.getClientRects().length || getComputedStyle(n).visibility === 'hidden') continue;
      var lbl = n.getAttribute('aria-label') || '', tx = (n.textContent || '').replace(/\s+/g, ' ').trim();
      if(n.hasAttribute('data-close') || n.hasAttribute('data-dayclose') || n.getAttribute('data-act') === 'close') tiers[0].push(n);
      else if(/^(close|cancel|dismiss)\b/i.test(lbl)) tiers[1].push(n);
      else if(/(cancel|close)(btn)?$/i.test(n.id || '')) tiers[2].push(n);
      else if(/^(cancel|close|not now|✕|×|✖)$/i.test(tx)) tiers[3].push(n);
    }
    for(var t = 0; t < tiers.length; t++) if(tiers[t].length) return tiers[t][0];
    return null;
  }
  /* the sheet's own state, to see a close that is still fading out */
  function crSig(el){ return el.className + '|' + (el.getAttribute('style') || ''); }
  /* true once the sheet is gone, is on its way out, or something now sits over it (a "discard?"
     question). The drawer drops its backdrop a frame AFTER the panel closes (its observer runs on
     rAF), so crIsSheet() reads the drawer off the panel. */
  function crGone(el, sig){
    if(!crIsSheet(el) || crTopSheet() !== el) return true;
    return sig != null && crSig(el) !== sig;
  }
  function crCloseSheet(el){
    if(!el || !crIsSheet(el)) return true;
    var sig = crSig(el), tried = [];
    for(var n = 0; n < 3; n++){
      var c = crSheetCloser(el, tried);
      if(!c) break;
      tried.push(c);
      try{ c.click(); }catch(_e){}
      if(crGone(el, sig)) return true;
    }
    var s = crScrimOf(el);
    if(s){ try{ s.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); }catch(_e2){} }
    return crGone(el, sig);
  }
  /* every open sheet, top first; false if one would not go, or a question came up in its place */
  function crCloseAllSheets(keep){
    var start = crSheets(), done = [];
    for(var n = 0; n < 8; n++){
      var list = crSheets().filter(function(el){ return el !== keep && done.indexOf(el) === -1; });
      if(list.some(function(el){ return start.indexOf(el) === -1; })) return false;
      if(!list.length) return true;
      if(!crCloseSheet(list[0])) return false;
      done.push(list[0]);
    }
    return false;
  }
  var crEscTop = null, crEscSig = null;
  window.addEventListener('keydown', function(e){
    if(e.key === 'Escape' || e.key === 'Esc'){
      try{ crEscTop = crTopSheet(); crEscSig = crEscTop ? crSig(crEscTop) : null; }catch(_e){ crEscTop = null; }
    }
  }, true);
  window.addEventListener('keydown', function(e){
    if(e.key !== 'Escape' && e.key !== 'Esc') return;
    var t = crEscTop, sig = crEscSig; crEscTop = null; crEscSig = null;
    if(!t || e.defaultPrevented || e.isComposing || crGone(t, sig)) return;
    e.preventDefault();
    crCloseSheet(t);
  });
  /* The sheet on top when the current history entry was recorded. A sheet that records its own entry
     (Suppliers: navSetView('suppliers') after it shows) is a PAGE for Back's purposes; closing it and
     stepping forward would leave a dead entry and a second Back that does nothing. */
  var crPopSkip = 0;
  window.addEventListener('popstate', function(e){
    if(crPopSkip){
      var fresh = (Date.now() - crPopSkip) < 1500;
      crPopSkip = 0;
      if(fresh){ e.stopImmediatePropagation(); return; }   /* our own forward step: nothing moved */
    }
    var t = null;
    try{ t = crTopSheet(); }catch(_e){}
    if(t && t === crEntrySheet) t = null;   /* it owns the entry being left: a real Back, as before */
    if(t){
      var popped = history.state, a = document.activeElement, sig0 = crSig(t);
      var tgt = (a && a !== document.body && t.contains(a)) ? a : t;
      try{ tgt.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true })); }catch(_e2){}
      if(crGone(t, sig0)){
        e.stopImmediatePropagation();
        if(history.state === popped){
          crPopSkip = Date.now();
          try{ history.forward(); }catch(_e3){ crPopSkip = 0; }
        }
        return;
      }
    }
    if(e.state && e.state.app === 'cardinal-nav'){
      navRestore(e.state);
    }
    try{ crEntrySheet = crTopSheet(); }catch(_e4){ crEntrySheet = null; }
  });
  /* #22: the Schedule Board's day sheet stayed on top while the tabs changed the page under it.
     Capture phase, registered before cr-pwatab's own listener, so the sheets go first. The drawer's
     backdrop is the one sheet a drawer-row tap must leave to the drawer. */
  document.addEventListener('click', function(e){
    var t = (e.target instanceof Element) ? e.target : null;
    if(!t) return;
    var nav = t.closest('#pwaNav .pwatab[data-tab="home"],#pwaNav .pwatab[data-tab="jobs"],#pwaNav .pwatab[data-tab="sched"],#navMenu .navopt');
    if(!nav) return;
    if(!crSheets().length) return;
    if(!crCloseAllSheets(document.getElementById('navBackdrop'))){
      e.preventDefault(); e.stopImmediatePropagation();
      try{ var nm = document.getElementById('navMenu'); if(nm && nm.style.display === 'block') nm.style.display = 'none'; }catch(_e){}
    }
  }, true);
  window.CardinalSheets = Object.assign(window.CardinalSheets || {}, {
    list: crSheets, top: crTopSheet, close: crCloseSheet, closeAll: crCloseAllSheets
  });
"""
edit('11 sheets mechanism', OLD_1341, NEW_1341)
edit('11 navSetView remembers the sheet that owns the entry',
"        history.pushState(st, '');\n      }\n    }catch(_e){}\n  };\n",
"        history.pushState(st, '');\n      }\n    }catch(_e){}\n"
"    try{ crEntrySheet = crTopSheet(); }catch(_e2){ crEntrySheet = null; }   /* 1430: see the sheet mechanism below */\n"
"  };\n")


# ════════════════════════════════════════════════════════════════════════════
# #16a — "Switch portal" opens the picker over the page you are on
# ════════════════════════════════════════════════════════════════════════════
edit('16a switch portal in place',
"  else if(nav === 'landing'){ goToLanding(); }",
"  /* 1430 (audit #16): \"Switch portal\" opens the picker OVER the page you are on. goToLanding() tears\n"
"     down and paints the retail home first, so from Community the page underneath went Retail while the\n"
"     picker still ticked Community, and dismissing it left you in Retail. A field account keeps\n"
"     goToLanding() (its door back to Production, 1317) — the Front Door refuses him anyway. */\n"
"  else if(nav === 'landing'){\n"
"    if(window.CardinalFrontDoor && !(typeof isFieldUser === 'function' && isFieldUser())) window.CardinalFrontDoor.open();\n"
"    else goToLanding();\n"
"  }")


# ════════════════════════════════════════════════════════════════════════════
# #17 — a field account's way into a job is its punch card
# ════════════════════════════════════════════════════════════════════════════
edit('17 openProject field branch',
"  if((typeof isFieldUser === 'function' && isFieldUser())){ try{ crTell('The job\\u2019s address, phone and directions are on its punch card.'); }catch(_){} return; }",
"  if((typeof isFieldUser === 'function' && isFieldUser())){ crFieldJob(id); return; }   /* 1430 */")

edit('17 crFieldJob',
"function openProject(id){\n",
r"""/* 1430 (audit #17): a field account's way into a job is its PUNCH CARD. openProject() used to refuse
   him with a red error toast ("...are on its punch card") and leave him where he was — reached three
   ways (the board's Today rows, a Crew Dispatch chip, Quick jump). The tap now opens that job's open
   punch-out, his own first; a job with none says so in the neutral toast. Still never the client
   profile: Balance Due and the money tabs stay off his screen (1317; production sees no money).
   back:'none' — the board or Dispatch he tapped from stays put underneath. */
function crFieldJob(id){
  var rows = [], me = String((currentUser && currentUser.email) || '').toLowerCase();
  try{ rows = (window.CardinalPunch && window.CardinalPunch.rows) ? window.CardinalPunch.rows() : []; }catch(_){}
  var open = rows.filter(function(r){ return r && String(r.project_id) === String(id) && r.status !== 'done'; });
  var mine = open.filter(function(r){ return String(r.assigned_to || '').toLowerCase() === me; });
  var pick = mine[0] || open[0];
  if(pick && window.CardinalPunchCard && typeof window.CardinalPunchCard.open === 'function'){
    try{ window.CardinalPunchCard.open(pick.id, { back:'none' }); }catch(_){}
    return;
  }
  try{ crTell('No open punch-out on this job yet. When there is one, its punch card has the address and directions.', 'info'); }catch(_){}
}
function openProject(id){
""")


edit('17 crTell gains the neutral kind',
"      var f = (kind === 'ok') ? window.crToastOk : window.crToastErr;\n      if(typeof f === 'function') return f(text);",
"      /* 1430: 'info' — crToast's own neutral kind, for a plain statement that is neither a success nor a\n"
"         refusal (a field account's job with no punch-out). Every existing caller passes 'ok' or nothing. */\n"
"      if(kind === 'info' && typeof window.crToast === 'function') return window.crToast(text, 'info');\n"
"      var f = (kind === 'ok') ? window.crToastOk : window.crToastErr;\n      if(typeof f === 'function') return f(text);")


# ════════════════════════════════════════════════════════════════════════════
# #16c / #17 — drawer counts count what you can see; empty headings hide
# ════════════════════════════════════════════════════════════════════════════
OLD_APPLY = """    function applySections(){
      if(applying) return;
      if(!isDrawer() || railWidth() || (window.isFieldUser && window.isFieldUser())){   /* 1317: a field user's few rows are one flat list */
        applying = true; try{ clearSections(); }catch(_){ } applying = false; return;
      }
      applying = true;
      try{
        var st = secOpen, sec = null, open = true, count = 0;
        function stamp(){ if(sec) sec.setAttribute('data-crcount', String(count)); }
        Array.prototype.forEach.call(menu.children, function(el){
          if(!el.classList) return;
          if(el.classList.contains('navsec')){
            stamp();
            sec = el; count = 0;
            var id = secSlug(el.textContent);
            /* == null means "never chosen", which on the drawer means CLOSED. */
            open = (st[id] == null) ? false : !!st[id];
            if(el.getAttribute('data-crsec') !== id) el.setAttribute('data-crsec', id);
            el.setAttribute('aria-expanded', open ? 'true' : 'false');
            if(el.getAttribute('role') !== 'button'){
              el.setAttribute('role', 'button');
              el.setAttribute('tabindex', '0');
            }
            return;
          }
          if(!el.classList.contains('navopt') || isChrome(el)) return;
          if(!sec) return;                       /* rows above the first header stay put */
          count++;
          var want = open ? null : '1';
          if(want){ if(el.getAttribute('data-crhide') !== '1') el.setAttribute('data-crhide','1'); }
          else if(el.hasAttribute('data-crhide')) el.removeAttribute('data-crhide');
        });
        stamp();
      }catch(_){ }
      applying = false;
    }
"""
NEW_APPLY = """    /* 1430 (audit #16, #17): the count on a heading said what the markup holds, not what you can see —
       a rep's Sell read 6 over 5 rows, Resources 10 over 3, Account 4 over 3, because rows a ROLE hides
       (inline display:none, data-cradmin, the field CSS) were counted too. Every row is now read with
       the fold rule stood aside (data-crread on the menu for the one read, so a collapsed section
       still answers) and only
       rows that would show are counted. A heading left with none is tagged data-crempty and hidden —
       a field account saw DAILY, CRMS and RESOURCES with nothing under them (the 1317 rule meant to
       hide them loses to this drawer's display:flex !important). The read forces one style recalc,
       not one per row; every write is still a data-* attribute written only when it changes, which
       the style-filtered observer does not report, and `applying` guards it anyway. */
    function rowShows(el){
      try{ return getComputedStyle(el).display !== 'none'; }catch(_){ return true; }
    }
    function applySections(){
      if(applying) return;
      var flat = !isDrawer() || railWidth() || !!(window.isFieldUser && window.isFieldUser());   /* 1317: a field user's few rows are one flat list */
      applying = true;
      try{
        if(flat) clearSections();
        var kids = Array.prototype.slice.call(menu.children);
        menu.setAttribute('data-crread', '1');
        var shows = kids.map(function(el){ return !!(el.classList && el.classList.contains('navopt') && !isChrome(el) && rowShows(el)); });
        menu.removeAttribute('data-crread');
        var st = secOpen, sec = null, open = true, count = 0;
        function stamp(){
          if(!sec) return;
          if(!flat) sec.setAttribute('data-crcount', String(count));
          if(count){ if(sec.hasAttribute('data-crempty')) sec.removeAttribute('data-crempty'); }
          else if(sec.getAttribute('data-crempty') !== '1') sec.setAttribute('data-crempty', '1');
        }
        kids.forEach(function(el, ix){
          if(!el.classList) return;
          if(el.classList.contains('navsec')){
            stamp();
            sec = el; count = 0;
            if(flat) return;
            var id = secSlug(el.textContent);
            /* == null means "never chosen", which on the drawer means CLOSED. */
            open = (st[id] == null) ? false : !!st[id];
            if(el.getAttribute('data-crsec') !== id) el.setAttribute('data-crsec', id);
            el.setAttribute('aria-expanded', open ? 'true' : 'false');
            if(el.getAttribute('role') !== 'button'){
              el.setAttribute('role', 'button');
              el.setAttribute('tabindex', '0');
            }
            return;
          }
          if(!el.classList.contains('navopt') || isChrome(el)) return;
          if(!sec) return;                       /* rows above the first header stay put */
          if(shows[ix]) count++;
          if(flat) return;
          var want = open ? null : '1';
          if(want){ if(el.getAttribute('data-crhide') !== '1') el.setAttribute('data-crhide','1'); }
          else if(el.hasAttribute('data-crhide')) el.removeAttribute('data-crhide');
        });
        stamp();
      }catch(_){ }
      applying = false;
    }
"""
edit('16c applySections', OLD_APPLY, NEW_APPLY)

edit('16c the fold rule stands aside for the count read',
"  body:not(.cr-lnav-on) #navMenu .navopt[data-crhide=\"1\"]{display:none !important;}\n",
"  body:not(.cr-lnav-on) #navMenu:not([data-crread]) .navopt[data-crhide=\"1\"]{--cr-stack:\"1430: the 1115 fold rule edited in place; open rows keep their display:flex\";display:none !important;}   /* 1430: :not([data-crread]) — applySections() lifts the fold for one synchronous read */\n")

edit('16c empty heading css',
"  body:not(.cr-lnav-on) #navMenu .navopt[data-cr-pohid]{display:none !important;}\n}\n",
"  body:not(.cr-lnav-on) #navMenu .navopt[data-cr-pohid]{display:none !important;}\n}\n"
"/* 1430 (audit #16, #17): a heading with no row the person can see (applySections() tags it). Not\n"
"   width-gated: a field account's flat list has headings too. Out-specifies the drawer's own\n"
"   display:flex !important above by one class, deliberately — that rule must stay for every heading\n"
"   that has rows. */\n"
"body #navMenu .navsec.navsec[data-crempty=\"1\"]{--cr-stack:\"1430: an empty heading; the drawer's flex rule stays for the rest\";display:none !important;}\n")


# ════════════════════════════════════════════════════════════════════════════
# #23 — the Undo message clears the installed tab bar
# ════════════════════════════════════════════════════════════════════════════
edit('23 undo clears the tab bar',
".cr-undo-toast .btn:hover{background:rgba(200,32,46,.15)}\n",
".cr-undo-toast .btn:hover{background:rgba(200,32,46,.15)}\n"
"/* 1430 (audit #23): the stage-move Undo sat at bottom:24px over the installed tab bar (64px), so Jobs,\n"
"   + New and Schedule were dead for its 5 seconds. Same clearance #crToasts and 1416's Production undo\n"
"   use. :where() keeps it at the base rule's weight, so the estimate builder's own placement (.estundo)\n"
"   and Production's (.pbundo) still win. */\n"
":where(body.standalone) .cr-undo-toast{--cr-stack:\"1430: clears the installed tab bar; the base 24px serves the browser\";bottom:calc(76px + env(safe-area-inset-bottom,0px))}\n")


# ════════════════════════════════════════════════════════════════════════════
# #17 — Crew Dispatch is a Production screen
# ════════════════════════════════════════════════════════════════════════════
edit('17 dispatch is production',
"var p = document.getElementById('cr-pb');\nif(p && p.classList.contains('open')) return 'production';",
"var p = document.getElementById('cr-pb');\nif(p && p.classList.contains('open')) return 'production';\n"
"/* 1430 (audit #17): Crew Dispatch is one of Production's screens. Opening it closed the board, and\n"
"   with nothing else open this fell through to 'retail' — a field account's header turned \"Retail\". */\n"
"var dsp = document.getElementById('cr-disp');\nif(dsp && dsp.classList.contains('open')) return 'production';")


# ════════════════════════════════════════════════════════════════════════════
# #17 — a punch card opened from Dispatch covers it (both were z 9550; DOM order decided)
# ════════════════════════════════════════════════════════════════════════════
edit('17 punch card over dispatch',
"  display:none; position:fixed; inset:0; z-index:9550;\n  overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain;\n  background:var(--pk-g,#0c0d0f);",
"  /* 1430 (audit #17): 9560, not 9550. Crew Dispatch is also 9550, so whether a card opened from a\n"
"     Dispatch chip covered Dispatch depended on which of the two had been created first. */\n"
"  display:none; position:fixed; inset:0; z-index:9560;\n  overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain;\n  background:var(--pk-g,#0c0d0f);")


# ════════════════════════════════════════════════════════════════════════════
# #17 — Quick jump is not a field account's door (every row in it refuses him)
# ════════════════════════════════════════════════════════════════════════════
edit('17 palette refuses a field account',
"function open(){\nif(visible) return;\nvisible = true; sel = 0;",
"function open(){\nif(visible) return;\n"
"/* 1430 (audit #17): a field account's Quick jump listed All Clients, Leads & Jobs, Reports and every\n"
"   client — not one of them his (1317). The drawer row is hidden for him too. */\n"
"if(typeof window.isFieldUser === 'function' && window.isFieldUser()) return;\n"
"visible = true; sel = 0;")

edit('17 hide quick jump row',
"body.cr-field #newWrap, body.cr-field #cr-lnav, body.cr-field .pbnavbtn[data-hub=\"crews\"],\nbody.cr-field #navMenu .navsec{",
"body.cr-field #newWrap, body.cr-field #cr-lnav, body.cr-field .pbnavbtn[data-hub=\"crews\"],\nbody.cr-field #navMenu #cr-nav-palette-hint,   /* 1430 */\nbody.cr-field #navMenu .navsec{")


# ════════════════════════════════════════════════════════════════════════════
# #16b — the Front Door closes: a ✕, and Escape (through #11's mechanism)
# ════════════════════════════════════════════════════════════════════════════
edit('16b fd-x css',
"#cr-fd .fd-mark{font:700 26px/1 Georgia,'Times New Roman',serif;letter-spacing:-.02em}",
"#cr-fd .fd-mark{font:700 26px/1 Georgia,'Times New Roman',serif;letter-spacing:-.02em}\n"
"/* 1430 (audit #16): the Front Door had no close control — only a tap on the strip outside it, and on a\n"
"   phone the sheet covers ~90% of the screen. Escape now closes it too (the sheet mechanism in the nav\n"
"   module finds this button by its label). 44px; ink measured in both themes by gate_G. */\n"
"#cr-fd .fd-x{position:absolute;top:calc(6px + env(safe-area-inset-top,0px));right:6px;width:44px;height:44px;\n"
"  display:flex;align-items:center;justify-content:center;padding:0;margin:0;background:none;border:0;\n"
"  border-radius:10px;cursor:pointer;color:var(--fd-ink,#e8ded4);font:400 20px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}\n"
"#cr-fd .fd-x:hover{background:var(--fd-line,rgba(255,255,255,.07))}\n"
"#cr-fd .fd-x:focus-visible{outline:2px solid #c8202e;outline-offset:-2px}")

edit('16b fd-x markup',
"    '<div class=\"fd-sheet\" role=\"dialog\" aria-label=\"Cardinal front door\">' +",
"    '<div class=\"fd-sheet\" role=\"dialog\" aria-label=\"Cardinal front door\">' +\n"
"    '<button type=\"button\" class=\"fd-x\" data-fd-close=\"1\" aria-label=\"Close\">\\u2715</button>' +   /* 1430 */")

edit('16b fd-x click',
"document.addEventListener('click', function(e){\n  var row = e.target.closest && e.target.closest('#cr-fd .fdrow');",
"document.addEventListener('click', function(e){\n"
"  var _fx = /** @type {any} */ (e.target);\n"
"  if(_fx && _fx.closest && _fx.closest('#cr-fd [data-fd-close]')){ close(); return; }   /* 1430 */\n"
"  var row = e.target.closest && e.target.closest('#cr-fd .fdrow');")


# ════════════════════════════════════════════════════════════════════════════
# #11 — the address list's Escape is its own (else the form under it closed too)
# ════════════════════════════════════════════════════════════════════════════
edit('11 acClose owns its Escape',
"else if(e.key === 'Escape'){ acClose(); }",
"else if(e.key === 'Escape'){ e.preventDefault(); acClose(); }   /* 1430: this Escape is the list's, not the form's */")


# ════════════════════════════════════════════════════════════════════════════
# #24 — light-mode rail icons: Clients, Estimates, Pricing Catalog get their own glyphs
# ════════════════════════════════════════════════════════════════════════════
# The keyline (style 5) set drew Clients, Leads & Jobs, Estimates and Pricing Catalog as the same
# stack of lines. These are the dark set's own shapes (people, a ruled page, a tag) in keyline
# strokes — the drawn registry's `people`, `page` (one more rule, as dark has) and `tag` geometry.
edit('24 clients',
"clients:'<path d=\"M5 6h14\" class=\"m\"/><path d=\"M5 12h14\"/><path d=\"M5 18h9\" class=\"m\"/>',",
"clients:'<circle cx=\"9.2\" cy=\"8.4\" r=\"3.1\"/><path d=\"M3.4 19.8a5.8 5.8 0 0 1 11.6 0\"/><path d=\"M16.4 6.2a3.1 3.1 0 0 1 0 5.8\" class=\"m\"/><path d=\"M17.6 14.8a5.8 5.8 0 0 1 3 5\" class=\"m\"/>',   /* 1430 */")
edit('24 estimates',
"estimates:'<path d=\"M6 4h12\" class=\"m\"/><path d=\"M6 9h12\"/><path d=\"M6 14h12\" class=\"m\"/><path d=\"M6 19h7\" class=\"m\"/>',",
"estimates:'<path d=\"M13.6 2.9H6.9A1.9 1.9 0 0 0 5 4.8v14.4a1.9 1.9 0 0 0 1.9 1.9h10.2a1.9 1.9 0 0 0 1.9-1.9V8.2z\" class=\"m\"/><path d=\"M13.6 2.9v5.3H19\" class=\"m\"/><path d=\"M8.6 11.6h6.8M8.6 14.8h6.8M8.6 18h4\"/>',   /* 1430 */")
edit('24 pricing',
"pricingcatalog:'<path d=\"M5 6h14\" class=\"m\"/><path d=\"M5 12h9\"/><path d=\"M5 18h14\" class=\"m\"/>',",
"pricingcatalog:'<path d=\"M11.4 3.4H5a1.6 1.6 0 0 0-1.6 1.6v6.4a1.6 1.6 0 0 0 .5 1.2l7.5 7.5a1.6 1.6 0 0 0 2.3 0l6.2-6.2a1.6 1.6 0 0 0 0-2.3l-7.5-7.5a1.6 1.6 0 0 0-1-.7z\" class=\"m\"/><circle cx=\"7.8\" cy=\"7.8\" r=\"1.3\"/>',   /* 1430 */")


edit('24 community partners',
"communitypartners:'<path d=\"M5 8h6\" class=\"m\"/><path d=\"M13 8h6\" class=\"m\"/><path d=\"M5 16h14\"/>',",
"communitypartners:'<circle cx=\"7.5\" cy=\"9\" r=\"2.8\"/><circle cx=\"16.5\" cy=\"9\" r=\"2.8\" class=\"m\"/><path d=\"M2.4 19.5a5.2 5.2 0 0 1 10.2 0\"/><path d=\"M11.4 19.5a5.2 5.2 0 0 1 10.2 0\" class=\"m\"/>',   /* 1430 */")
# the unnamed rows (Switch portal, Storm Data): dark draws a dot, light drew a dash — the same
# hamburger stroke. A keyline ring, the dark dot's own shape. (Their missing glyphs are a separate
# finding and are not drawn here.)
edit('24 generic',
"generic:'<path d=\"M6 12h12\"/>'\n};",
"generic:'<circle cx=\"12\" cy=\"12\" r=\"4.2\"/>'   /* 1430: the dark dot's shape, not a dash */\n};")


# ════════════════════════════════════════════════════════════════════════════
# #16d — Tools hides the doors a non-admin cannot use
# ════════════════════════════════════════════════════════════════════════════
edit('16d tools admin doors',
"    if(!was){ dd.classList.add('open'); fitMenu(dd); }",
"    if(!was){ dd.classList.add('open'); gateDoors(dd); fitMenu(dd); }")

edit('16d gateDoors',
"function closeMenus(){\n  Array.prototype.forEach.call(B.querySelectorAll('.cbdd.open'), function(x){ x.classList.remove('open'); });\n}",
"function closeMenus(){\n  Array.prototype.forEach.call(B.querySelectorAll('.cbdd.open'), function(x){ x.classList.remove('open'); });\n}\n"
"/* 1430 (audit #16): three Tools doors answered a rep with nothing but a red \"Admin only.\" — their\n"
"   destinations exist, so resolveHide() shows them, and the person is only known after sign-in. The\n"
"   role is read as the menu opens, with the same test the three destinations refuse on (isAdminUser). */\n"
"var ADMIN_DOORS = { walk: 1, itellab: 1, medmig: 1 };\n"
"function gateDoors(dd){\n"
"  var adm = false;\n"
"  try{ adm = typeof window.isAdminUser === 'function' && !!window.isAdminUser(); }catch(_){}\n"
"  Array.prototype.forEach.call(dd.querySelectorAll('[data-go]'), function(el){\n"
"    var k = el.getAttribute('data-go');\n"
"    if(!ADMIN_DOORS[k]) return;\n"
"    var want = (adm && fn(ROUTES[k])) ? '' : 'none';\n"
"    if(el.style.display !== want) el.style.display = want;\n"
"  });\n"
"}")


# ════════════════════════════════════════════════════════════════════════════
# #7 — the bar's + New lifts the menu out of the header's stacking layer
# ════════════════════════════════════════════════════════════════════════════
edit('7 rise lifts the menu',
"  function rise(menu){\n    if(!menu || menu.style.display !== 'block') return;\n",
"  function rise(menu){\n    if(!menu || menu.style.display !== 'block') return;\n"
"    /* 1430 (audit #7): the menu lived inside the header's z-90 stacking layer, so over the Production\n"
"       board (9500), a production account's punch page (9400) and Crew Dispatch (9550) every option sat\n"
"       UNDER the screen. It is position:fixed — its parent decides only its stacking — so it moves to\n"
"       <body>, where #newMenu's own z-index (9700) applies. Once moved it stays; the header's + drops it\n"
"       from the same fixed coordinates. */\n"
"    if(menu.parentNode !== document.body) document.body.appendChild(menu);\n")


# ── apply, in order, each asserted exactly once ──────────────────────────────
for label, old, new in EDITS:
    n = s.count(old)
    if n != 1:
        raise pl.PatchError('%s: expected 1 occurrence, found %d' % (label, n))
    s = s.replace(old, new)
    assert s.count(new) >= 1, label

# self-computing sanity checks on the artifact
assert s.count('function crOpenFormCancel') == 0 and orig.count('function crOpenFormCancel') == 1
assert s.count("window.CardinalSheets = Object.assign") == 1
assert s.count('function crFieldJob(') == 1 and s.count('function crFsOverlayOpen(') == 1
assert s.count("crTell('The job\\u2019s address, phone and directions are on its punch card.')") == orig.count("crTell('The job\\u2019s address, phone and directions are on its punch card.')") - 1
assert s.count('data-fd-close') == 2
assert s.count('z-index:9550;') == orig.count('z-index:9550;') - 1
assert len(s) > len(orig)
pl.write_atomic(OUT, s)
pl.assert_in(OUT, 'window.CardinalSheets = Object.assign')
print('patch_G: %d edits applied -> %s (%d -> %d chars)' % (len(EDITS), OUT, len(orig), len(s)))
