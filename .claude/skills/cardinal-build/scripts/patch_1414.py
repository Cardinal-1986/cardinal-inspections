"""Build 1414 — the leftover emoji on the screens people use most become the app's drawn icons (29 Oct 2026,
design judge #15 of Theo's audit panel: "Leftover emoji ... replace with the drawn line icons already used in the
rail"). The 681/686-699 sweep finished the nav and the headings; these sat in rendered strings it never reached:
the Clients header, search and Select; the Activity title and its document/appointment avatars; the Quick jump
row; the INSURANCE badge, the claim strip and claim card; the address pin and rep mark; the Punch List card (the
ladder — 687, Theo's pick over the hammer); Upload SOL, the Scope of Loss folder, the insurance document rows and
iTel; Delete Client. One helper, crIco(name), wraps CardinalIcons.get so a dynamic string gets the same glyph the
static markup's data-cri does. Not every emoji in the file — these are the ones on the common screens."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(P, encoding='utf-8').read()
def one(t, old, new, n=1):
    c = t.count(old); assert c == n, (c, old[:90]); return t.replace(old, new)
I = "(window.crIco ? window.crIco('%s') : '')"
# helper + its size
s = one(s, "window.CardinalIcons = Object.assign(window.CardinalIcons || {}, CardinalIcons);",
"window.CardinalIcons = Object.assign(window.CardinalIcons || {}, CardinalIcons);\n"
"/* 1414: the drawn glyph for a DYNAMIC string (static markup uses data-cri). One size, inline with the text. */\n"
"function crIco(name){ return CardinalIcons.get(name, 'crico'); }\nwindow.crIco = crIco;")
s = one(s, ".cri.lg{width:.92em;height:.92em;vertical-align:-.09em;margin-right:.12em",
".cri.crico{width:1.05em;height:1.05em;vertical-align:-.16em;margin-right:.35em;display:inline-block}\n"
".cri.lg{width:.92em;height:.92em;vertical-align:-.09em;margin-right:.12em")
# static markup — hydrate() fills data-cri at load
s = one(s, 'id="cliHomeBtn" style="padding:8px 14px;font-size:13px;">&#127968; Home</button>',
           'id="cliHomeBtn" data-cri="home lg" style="padding:8px 14px;font-size:13px;">Home</button>')
s = one(s, 'id="cdSelBtn" style="display:none;">&#9745; Select ', 'id="cdSelBtn" style="display:none;">Select ')
s = one(s, '<div class="cd-search">&#128269;&#65039; <input', '<div class="cd-search"><span data-cri="search lg"></span> <input')
s = one(s, 'id="actToggle">&#9889; Activity <span', 'id="actToggle" data-cri="bolt lg">Activity <span')
s = one(s, """<button id="delClientBtn" type="button">
      &#128465; Delete Client</button>""", """<button id="delClientBtn" type="button">
      Delete Client</button>""")
# dynamic strings
s = one(s, "ini:'\\uD83D\\uDCE7', label:'Document Se", "ini:'\\uD83D\\uDCE7', ico:'mail', label:'Document Se")
s = one(s, "ini:'\\uD83D\\uDCC5', label:'Appointment", "ini:'\\uD83D\\uDCC5', ico:'calendar', label:'Appointment")
s = one(s, "'<div class=\"actitem\"><span class=\"ic icav\">' + (x.email ? avatarHtml(x.email, 30) : esc(x.ini)) + '</span>'",
"'<div class=\"actitem\"><span class=\"ic icav\">' + (x.email ? avatarHtml(x.email, 30) : (x.ico && window.crIco ? window.crIco(x.ico) : esc(x.ini))) + '</span>'")
s = one(s, "'<span>\\uD83D\\uDD0D</span>' +\n'<span class=\"lbl\">Quick jump</span>'",
           "'<span>' + " + (I % 'search') + " + '</span>' +\n'<span class=\"lbl\">Quick jump</span>'")
s = one(s, "'<span class=\"insBadge\">&#128737;&#65039; INSURANCE</span>'", "'<span class=\"insBadge\">' + " + (I % 'shield') + " + 'INSURANCE</span>'")
s = one(s, "'<span class=\"dbaddr\">&#128205; ' + esc(pr.address)", "'<span class=\"dbaddr\">' + " + (I % 'pin') + " + esc(pr.address)")
s = one(s, "'<span class=\"dbrep\">&#128100; <b>'", "'<span class=\"dbrep\">' + " + (I % 'person') + " + '<b>'")
s = one(s, "'<span class=\"t\">\\uD83D\\uDD28 Punch List</span>'", "'<span class=\"t\">' + " + (I % 'ladder') + " + 'Punch List</span>'")
s = one(s, "'<button class=\"solBtn\" id=\"solBtn\">&#128228; Upload SOL</button>'", "'<button class=\"solBtn\" id=\"solBtn\">Upload SOL</button>'")
s = one(s, "'<div class=\"solIcon\">&#128194;</div>'", "'<div class=\"solIcon\">' + " + (I % 'folder') + " + '</div>'")
s = one(s, "data-insdocupload=\"' + esc(dt.key) + '\">&#128228; ' +", "data-insdocupload=\"' + esc(dt.key) + '\">' +")
for k, ic in [('authorization', 'pencil'), ('service_agreement', 'page'), ('three_day_right', 'calendar'), ('scope_of_loss', 'houses'), ('policy', 'contract')]:
    s = one(s, "{ key: '%s'," % k, "{ key: '%s', ico: '%s'," % (k, ic))
s = one(s, "'<span class=\"insdocic\">' + dt.icon + '</span>'", "'<span class=\"insdocic\">' + ((dt.ico && window.crIco) ? window.crIco(dt.ico) : dt.icon) + '</span>'", 2)
s = one(s, "'<span class=\"cr-itel-bar-t\">📋 iTel</span>'", "'<span class=\"cr-itel-bar-t\">' + " + (I % 'clipboard') + " + 'iTel</span>'")
s = one(s, '<div class="cr-xl-eyebrow">🛡 Insurance Claim</div>', '<div class="cr-xl-eyebrow">${window.crIco ? window.crIco(\'shield\') : \'\'}Insurance Claim</div>')
s = one(s, "'<div class=\"hd\"><span class=\"lbl\">\\uD83D\\uDEE1\\uFE0F Claim</span></div>'", "'<div class=\"hd\"><span class=\"lbl\">' + " + (I % 'shield') + " + 'Claim</span></div>'", 2)
s = one(s, "'<span class=\"lbl\">\\uD83D\\uDEE1\\uFE0F ' + esc(claim.carrier || 'Claim')", "'<span class=\"lbl\">' + " + (I % 'shield') + " + esc(claim.carrier || 'Claim')")
s = one(s, 'id="cdFunnelBtn" title="Filters">&#9923;<span', 'id="cdFunnelBtn" title="Filters" data-cri="funnel lg"><span')
s = one(s, "'<span class=\"afav\"><span class=\"circ circav\">' + (x.email ? avatarHtml(x.email, 38) : esc(x.ini)) + '</span>",
"'<span class=\"afav\"><span class=\"circ circav\">' + (x.email ? avatarHtml(x.email, 38) : (x.ico && window.crIco ? window.crIco(x.ico) : esc(x.ini))) + '</span>")
s = one(s, "'<span class=\"kpst\">\\uD83D\\uDD58 History</span>", "'<span class=\"kpst\">' + " + (I % 'clock') + " + 'History</span>")
# the big 22px document-row icons were sized for emoji; a stroke glyph reads at 22px
s = one(s, ".insdocic{font-size:22px;flex:0 0 auto;line-height:1;width:26px;text-align:center;}",
           ".insdocic{font-size:22px;flex:0 0 auto;line-height:1;width:26px;text-align:center;}\n.insdocic .cri.crico,.solIcon .cri.crico{width:1em;height:1em;margin:0}")
s = one(s, ">v2026-10-29 build 1413<", ">v2026-10-29 build 1414<")
s = one(s, """  { b: 1413, d:'2026-10-29',""",
"""  { b: 1414, d:'2026-10-29', t:'Drawn icons instead of emoji', s:'The emoji still left on the Clients screen, the Activity panel, the client page (address, rep, Punch List, Delete), and the insurance claim and document rows are now the same drawn icons as the menu.' },
  { b: 1413, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1414')
