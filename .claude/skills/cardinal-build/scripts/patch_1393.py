"""Build 1393 — the audit's readability fixes (23 Oct 2026). Measured in Chromium against the worst
painted ground, both themes, by the polish sweep; every replacement ink is an existing token pair.
1. An insurance job in dark mode paints the Docket cream ground (--ct-bg), and four controls on it kept
   the dark theme's light ink: Back to client profile (1.11:1) and Upload files (1.15:1) on Job
   Documents, the guide row's "Email to client" (1.11:1) and its label (1.77:1). They take --ct-ink /
   --ct-ink-2, which follow docket and siren both.
2. Work Orders in the desktop header (#woQuick, .btn.ghost) painted white on the white insurance header
   (1.00:1). It takes the header's own ink, --hmt (the per-CRM chrome token).
3. Job Documents, retail dark: the intro (2.97:1), "Nothing here yet" (.axnote #5c4a42, 2.38:1) and the
   client name (inline #8a6f66, 4.31:1 in both themes) take --rbe-mute.
4. The left rail's selected-CRM button is white on its accent; on Community's mint that is 1.92:1 (and
   production's orange 2.03, sales 3.61). Each accent now carries its own on-ink (--lnav-on).
   Section counts and chevrons: 3.72:1 dark, 4.27:1 light -> the section label's own ink / --rbe-mute.
5. Scanner: "Add page" opened the camera only after the current page had been flattened and cleaned —
   on an iPhone that is past the tap, so the camera did not open. The camera opens first now and the
   page is kept while you take the next one. With no photo the screen says what to do."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1 + 2 — insurance cream ground, dark theme
one("""body.claim-insurance #paymentsView,
body.claim-insurance #tasksView,
body.claim-insurance #docsView,
body.claim-insurance #apptsView,
body.claim-insurance #commsView,
body.claim-insurance #galleryView{
  background:var(--ct-bg,#FAF8F7);
}""",
"""body.claim-insurance #paymentsView,
body.claim-insurance #tasksView,
body.claim-insurance #docsView,
body.claim-insurance #apptsView,
body.claim-insurance #commsView,
body.claim-insurance #galleryView{
  background:var(--ct-bg,#FAF8F7);
}
/* 1393: the ghost/dark buttons and chips on that ground kept the dark theme's light ink (1.11:1). */
body.claim-insurance #docsView,
body.claim-insurance #projectView .db-guiderow{ --btn-ink:var(--ct-ink,#17181B); --btn-line:var(--ct-line-strong,#DED8D6); }
body.claim-insurance #docsView .chipbtn:not(#jdScanBtn){ --cr-stack:"1393 the cream insurance ground needs the dark ink"; color:var(--ct-ink,#17181B); border-color:var(--ct-line-strong,#DED8D6); }
body.claim-insurance #projectView .db-guiderow .dbg-t{ --cr-stack:"1393 the cream insurance ground needs the dark ink"; color:var(--ct-ink-2,#6E6663); }
/* 1393: a ghost button in the header takes the header's ink, whatever the CRM paints the header */
header.site #woQuick.btn.ghost{ --cr-stack:"1393 the header's own per-CRM ink"; color:var(--hmt,#fff); border-color:var(--hln,rgba(255,255,255,.45)); }""")

# 3 — Job Documents, retail dark
one("""#activityView .subnote,#companyDocsView .subnote{color:var(--rbe-mute,#9aa0a8)}""",
    """#activityView .subnote,#companyDocsView .subnote,#docsView .subnote{--cr-stack:"1393 the base .subnote is --muted, a light-era ink, and stays for views on light cards";color:var(--rbe-mute,#9aa0a8)}""")
one(""".axnote{font:600 13px 'Segoe UI',Arial,sans-serif;color:#5c4a42;}""",
    """.axnote{font:600 13px 'Segoe UI',Arial,sans-serif;color:var(--rbe-mute,#5c4a42);}   /* 1393: #5c4a42 was 2.38:1 on dark */""")
one("""<span id="jdClient" style="color:#8a6f66;font-size:17px;"></span>""",
    """<span id="jdClient" style="color:var(--rbe-mute,#8a6f66);font-size:17px;"></span>""")

# 4 — the rail's selected CRM, and its counts
one("""#cr-lnav .lnav-crm button.on{color:#fff;background:var(--lnav-crmc,#c8202e)}""",
    """#cr-lnav .lnav-crm button.on{color:var(--lnav-on,#fff);background:var(--lnav-crmc,#c8202e)}""")
one("""h.style.setProperty('--lnav-crmc', CRM_COLOR[crm] || CRM_COLOR.retail);""",
    """h.style.setProperty('--lnav-crmc', CRM_COLOR[crm] || CRM_COLOR.retail);
/* 1393: white on community's mint was 1.92:1, on production's orange 2.03 — each accent names its ink */
h.style.setProperty('--lnav-on', ({ community:'#062b1f', production:'#1a1205', sales:'#1a1205' })[crm] || '#fff');""")
one("""#cr-lnav .lnav-sec .cnt{margin-left:auto;font-weight:700;letter-spacing:.04em;
  color:var(--rbe-mute2,#6d747e)}
#cr-lnav .lnav-sec .chev{font-size:11px;line-height:1;transition:transform .14s;
  color:var(--rbe-mute2,#6d747e)}""",
"""#cr-lnav .lnav-sec .cnt{margin-left:auto;font-weight:700;letter-spacing:.04em;
  color:var(--rbe-mute,#6d747e)}
#cr-lnav .lnav-sec .chev{font-size:11px;line-height:1;transition:transform .14s;
  color:var(--rbe-mute,#6d747e)}""")
one(""":root:not([data-theme="rb-light"]) #cr-lnav .lnav-sec .chev{color:#6b7688}""",
    """:root:not([data-theme="rb-light"]) #cr-lnav .lnav-sec .chev{color:#8d97a6}   /* 1393: #6b7688 was 3.72:1; the section label's own ink */""")

# 5 — scanner: Add page inside the tap; an empty screen says what to do
one("""    var f = camInput.files && camInput.files[0]; camInput.value = '';
    if(f) scnLoadPhoto(f);""",
"""    var f = camInput.files && camInput.files[0]; camInput.value = '';
    if(f) Promise.resolve(pendingKeep).then(function(){ pendingKeep = null; scnLoadPhoto(f); });""")
one("""    else if(act === 'add'){ if(cur) scnKeep().then(function(){ camInput.click(); }); else camInput.click(); }""",
"""    /* 1393: the camera first — keeping the page is a second of flattening, and on an iPhone a click()
       after that is outside the tap and the camera never opens. The next photo waits for the keep. */
    else if(act === 'add'){ camInput.click(); if(cur) pendingKeep = scnKeep(); }""")
one("""  if(!cur){ cv.width = 0; return; }
  var W = stage.clientWidth, H = stage.clientHeight, s = Math.min(W / cur.src.width, H / cur.src.height) * 0.94;""",
"""  var nt0 = ROOT.querySelector('.scn-note'), rb = /** @type {HTMLButtonElement} */ (ROOT.querySelector('[data-scn="rotate"]'));
  if(rb) rb.disabled = !cur;
  if(!cur){ cv.width = 0;
    /* 1393: an empty black screen with "drag the red corners" read as broken */
    if(nt0) nt0.textContent = pages.length ? pages.length + (pages.length === 1 ? ' page' : ' pages') + ' kept. Add page for another, or Save PDF.'
                                           : 'No photo yet. Tap Retake to photograph the page.';
    return; }
  if(nt0 && !cur.rot) nt0.textContent = 'Drag the red corners to the corners of the page.';
  var W = stage.clientWidth, H = stage.clientHeight, s = Math.min(W / cur.src.width, H / cur.src.height) * 0.94;""")
one("""async function scnKeep(){
  if(!cur) return;""",
"""var pendingKeep = null;
async function scnKeep(){
  if(!cur) return;""")
one("""async function scnFinish(){
  if(cur) await scnKeep();""",
"""async function scnFinish(){
  if(pendingKeep) await pendingKeep;
  if(cur) await scnKeep();""")

one("""    else if(act === 'retake'){ cur = null; camInput.click(); }""",
    """    else if(act === 'retake'){ cur = null; camInput.click(); scnLayout(); }""")
one(">v2026-10-23 build 1392<", ">v2026-10-23 build 1393<")
one("""  { b: 1392, d:'2026-10-23',""",
"""  { b: 1393, d:'2026-10-23', t:'Readable on every job', s:'On an insurance job in dark mode, Back to client profile, Upload files, Email to client and the Work Orders button were nearly invisible \\u2014 light text on the cream page. They read now. The Job Documents page\\u2019s intro, empty message and client name are brighter in dark mode. The selected Community button in the left rail has dark text on its mint instead of white, and the section counts are easier to read. In the scanner, Add page opens the camera on the first tap on an iPhone, and an empty scanner says what to do.' },
  { b: 1392, d:'2026-10-23',""")
pl.write_atomic(path, s)
print('ok 1393')
