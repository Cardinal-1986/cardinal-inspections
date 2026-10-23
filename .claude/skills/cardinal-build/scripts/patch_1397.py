"""Build 1397 — the second polish sweep (23 Oct 2026; 29 more screens, both themes, phone + desktop).
1. Payments worksheet footer "Paid · Balance due" was #1b1b1b on the darkened row, 1.20:1 — the row got a dark
   ground (2268) and no ink. It takes --rbe-ink.
2. Client-name subtitles on Payments / Tasks / Appointments (inline #8a6f66, 4.31:1) and Communications
   (inline #9c1822, 2.43:1) take --rbe-mute; insurance keeps its own !important red. Appointments and Tasks
   intros (#5c5c5c, 2.97:1) join the --rbe-mute .subnote list.
3. System Health: heading and × were #c8202e on #241512 (3.11:1) -> #e35c63 (5.02:1); × is a 44px target;
   "1 rows" -> "1 row".
4. Settings: Team / Audit Log / Backup rows were shown with display:block on a flex row, so the chevron sat
   beside the label instead of at the right edge. They show as flex.
5. The Inspections list also listed contracts, invoices and work orders. It excludes them now.
6. Phone layouts: Company Documents' Pre-Install Guide rows wrap their buttons under the name (the name had
   ~70px, one word a line); Quick Inspection's address row wraps (Search was clipped, My location was off the
   card); an estimate line item's price row gives the amount its own line and the name clears the move/✕
   buttons.
7. The ✦ Ask button stands aside while a screen with its own bottom actions is open — the estimate builder,
   the document editor, Communications, Quick Inspection's start, the Resource Library and the scanner —
   where it sat on Continue, Send and line amounts."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1
one(""":root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community) .wsrow{background:var(--rbe-bg2,#262a31);border-color:var(--rbe-line2,#2b2b33);}""",
    """:root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community) .wsrow{background:var(--rbe-bg2,#262a31);border-color:var(--rbe-line2,#2b2b33);color:var(--rbe-ink,#cfd6df);}   /* 1397: the ground went dark and the ink stayed #1b1b1b (1.20:1) */""")
# 2
for idn, fs in (('payClient', '17'), ('tskClient', '17'), ('apClient', '18')):
    one('<span id="%s" style="color:#8a6f66;font-size:%spx;"></span>' % (idn, fs),
        '<span id="%s" style="color:var(--rbe-mute,#8a6f66);font-size:%spx;"></span>' % (idn, fs))
one('<span id="commsCli" style="color:#9c1822;"></span>', '<span id="commsCli" style="color:var(--rbe-mute,#9c1822);"></span>')
one('#activityView .subnote,#companyDocsView .subnote,#docsView .subnote{', '#activityView .subnote,#companyDocsView .subnote,#docsView .subnote,#apptsView .subnote,#tasksView .subnote{')
# 3
one(""".cr-ahc-head h3{margin:0;font:800 13px 'Segoe UI',Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#c8202e}""",
    """.cr-ahc-head h3{margin:0;font:800 13px 'Segoe UI',Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#e35c63}""")
one(""".cr-ahc-head .close{background:transparent;border:0;color:#c8202e;cursor:pointer;font:800 18px 'Segoe UI',Arial,sans-serif;padding:0 4px;line-height:1}""",
    """.cr-ahc-head .close{background:transparent;border:0;color:#e35c63;cursor:pointer;font:800 18px 'Segoe UI',Arial,sans-serif;padding:0 4px;line-height:1;min-width:44px;min-height:44px}""")
one("""return { status:'ok', message:'Reachable · ' + (r.count == null ? '?' : r.count) + ' rows' };""",
    """return { status:'ok', message:'Reachable · ' + (r.count == null ? '?' : r.count) + (r.count === 1 ? ' row' : ' rows') };""")
# 4
one("""  document.getElementById('backupNav').style.display =
    (ADMIN_EMAILS.indexOf(userEmail) !== -1) ? 'block' : 'none';
  document.getElementById('auditNav').style.display =
    (userEmail === 'theo@cardinalrenovations.net') ? 'block' : 'none';""",
"""  /* 1397: .setrow is a flex row; 'block' put the chevron beside the label */
  document.getElementById('backupNav').style.display =
    (ADMIN_EMAILS.indexOf(userEmail) !== -1) ? 'flex' : 'none';
  document.getElementById('auditNav').style.display =
    (userEmail === 'theo@cardinalrenovations.net') ? 'flex' : 'none';""")
# 5
one("""    filter:function(r){ return !isEstimateTitle(r.title) && !isFileDoc(r.title); }, sort:function(a,b){ return String(b.created_at).localeCompare(String(a.created_at)); } },
  estimates:""",
"""    /* 1397: contracts, invoices and work orders are not inspections */
    filter:function(r){ return !isEstimateTitle(r.title) && !isFileDoc(r.title) && !isContractTitle(r.title) && !isWorkOrderTitle(r.title) && !/^\\s*invoice\\b/i.test(r.title || ''); }, sort:function(a,b){ return String(b.created_at).localeCompare(String(a.created_at)); } },
  estimates:""")
# 6
one(""".cd-guiderow{
  display:flex; align-items:center; gap:12px; padding:13px 15px; margin-bottom:10px;""",
""".cd-guiderow{
  display:flex; align-items:center; gap:12px; padding:13px 15px; margin-bottom:10px; flex-wrap:wrap;   /* 1397: the name had ~70px at 390 */""")
one(""".cd-guiderow .cdg-name{ flex:1; min-width:0; }""", """.cd-guiderow .cdg-name{ flex:1; min-width:180px; }""")
one("""      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <input type="text" id="qiAddrInp" placeholder="Type an address&#8230;" style="flex:1;""",
"""      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        <input type="text" id="qiAddrInp" placeholder="Type an address&#8230;" style="flex:1 1 220px;min-width:0;""")
one(""".cr-est-move{position:absolute;top:8px;right:38px;display:flex;gap:2px}""",
""".cr-est-move{position:absolute;top:8px;right:38px;display:flex;gap:2px}
/* 1397: at 390 the amount had ~50px ("$2,040.0") and the name ran under the move/✕ buttons */
@media (max-width:560px){ .cr-est-lineitem{padding-top:40px} .cr-est-lineitem .pricing{grid-template-columns:1fr 1fr 1fr} .cr-est-lineitem .pricing .amount{grid-column:1 / -1} }""")
# 7
one("""#cr-ai-fab.tucked{display:none;}""", """#cr-ai-fab.tucked,#cr-ai-fab.tucked2{display:none;}""")
one("""  function aiPaintFab(){
    var f = aiQ('cr-ai-fab'); if(!f) return;
    var on = aiAllowed();
    if(on !== aiShown){ aiShown = on; f.classList.toggle('on', on); if(!on) aiClose(); }
  }""",
"""  /* 1397: screens with their own bottom actions — the button sat on Continue, Send and line amounts */
  var aiAside = null;
  function aiBusyScreen(){
    var shown = function(id){ var e = document.getElementById(id); return !!(e && e.getClientRects().length && getComputedStyle(e).display !== 'none'); };
    var open = function(id){ var e = document.getElementById(id); return !!(e && e.classList.contains('open')); };
    return open('cr-est-view') || open('editorView') || open('cr-scan') || shown('commsView') || shown('qiStartView') || shown('resourceLibraryView');
  }
  function aiPaintFab(){
    var f = aiQ('cr-ai-fab'); if(!f) return;
    var on = aiAllowed();
    if(on !== aiShown){ aiShown = on; f.classList.toggle('on', on); if(!on) aiClose(); }
    var aside = aiBusyScreen();
    if(aside !== aiAside){ aiAside = aside; f.classList.toggle('tucked2', aside); }
  }""")
one("""  aiPaintFab(); setInterval(aiPaintFab, 3000);""",
    """  aiPaintFab(); setInterval(aiPaintFab, 3000);
  document.addEventListener('click', function(){ setTimeout(aiPaintFab, 350); }, true);   /* 1397: follow a screen change within a tap, not 3s */""")

one(">v2026-10-23 build 1396<", ">v2026-10-23 build 1397<")
one("""  { b: 1396, d:'2026-10-23',""",
"""  { b: 1397, d:'2026-10-23', t:'Polish across the app', s:'The Payments page\\u2019s Paid / Balance due line is readable in dark mode (it was nearly invisible). Client names next to page titles and the Appointments and Tasks intros are brighter. System Health\\u2019s heading reads, and it says \\u201c1 row\\u201d. The Settings rows line their arrows up on the right. The Inspections list no longer lists contracts and invoices. On a phone, the Company Documents guide rows, Quick Inspection\\u2019s address search and an estimate\\u2019s line prices fit. The \\u2726 Ask button steps aside on screens with their own buttons at the bottom \\u2014 estimates, documents, messages, Quick Inspection, the Library and the scanner.' },
  { b: 1396, d:'2026-10-23',""")
pl.write_atomic(path, s)
print('ok 1397')
