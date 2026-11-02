#!/usr/bin/env python3
"""patch_1441_shell — build 1441, round-1 leftovers: menus, icons and questions (builder A1's slice, made on build 1438).

  P01.03  a rep's Tools menu hides Reports and Settings, like the rep's drawer does
  P01.08  Self Check: its drawer row sits above the footer, and a run leaves history as it found it
  P01.14 / P06.03  every drawer row is a drawn glyph, and no two drawer rows share one
  P06.08 / J15.10  leftover colour emoji: Library floating buttons, profile appointments,
          the "+ New contract" menu
  J15.02  the drawer's Production row label lines up with its siblings
  J15.03 / P06.05  rail rows, the header +, Community job-menu tiles inherit the app font;
          the tile counts are the app sans with tabular figures
  P08.06  Schedule day sheet: drawn calendar in the title, no emoji in Type, the row says its kind
  P08.12  Punch & Repairs: drawn search glyph, a hint that fits
  P10.07  hideOpt() compares before it writes
  P12.02  three success toasts pass 'ok'
  P12.09  yes/no sheets that fell back to "Continue" name their action
  J16.06  (V5) the drawer's pressed Text size / Appearance buttons follow the portal colour

Usage: python3 patch_1441_shell.py <target.html>   (patched in place, atomically)
Does NOT bump the build stamp or add a CHANGELOG entry.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1]
s = pl.load(P)


def one(src, a, b):
    n = src.count(a)
    assert n == 1, f'anchor count {n} != 1: {a[:90]!r}'
    return src.replace(a, b, 1)


# ─────────────────────────────────────────────────────────────── P01.03
s = one(s,
"""/* 1430 (audit #16): three Tools doors answered a rep with nothing but a red "Admin only." — their
   destinations exist, so resolveHide() shows them, and the person is only known after sign-in. The
   role is read as the menu opens, with the same test the three destinations refuse on (isAdminUser). */
var ADMIN_DOORS = { walk: 1, itellab: 1, medmig: 1 };""",
"""/* 1430 (audit #16): three Tools doors answered a rep with nothing but a red "Admin only." — their
   destinations exist, so resolveHide() shows them, and the person is only known after sign-in. The
   role is read as the menu opens, with the same test the three destinations refuse on (isAdminUser).
   A1 (P01.03): Reports and Settings too — the drawer's hideAdminItemsForNonAdmin() hides exactly those
   two rows from the same person, so Tools was the one door left open (Reports is moved in by relocateNav). */
var ADMIN_DOORS = { walk: 1, itellab: 1, medmig: 1, reports: 1, settings: 1 };""")

# ─────────────────────────────────────────────────────────────── P10.07
s = one(s,
"""function hideOpt(dataNav){
var el = document.querySelector('#navMenu .navopt[data-nav="' + dataNav + '"]');""",
"""function hideOpt(dataNav){
var el = /** @type {HTMLElement} */ (document.querySelector('#navMenu .navopt[data-nav="' + dataNav + '"]'));""")
s = one(s,
"""if(el){ el.style.display = 'none'; el.setAttribute('data-cradmin', '1'); }""",
"""/* A1 (P10.07): compared first — this runs on every reorg pass, and an unchanged write still wakes every body observer */
if(el){ if(el.style.display !== 'none') el.style.display = 'none'; if(el.getAttribute('data-cradmin') !== '1') el.setAttribute('data-cradmin', '1'); }""")

# ─────────────────────────────────────────────────── P01.14 / P06.03 / P06.08
# injected drawer rows: emoji -> drawn glyphs (the .lg class the static rows carry)
s = one(s,
"""var hub = makeOpt('cr-nav-communityhub',
'\\uD83C\\uDFD8\\uFE0F Community Hub',""",
"""var hub = makeOpt('cr-nav-communityhub',
(window.CardinalIcons ? window.CardinalIcons.get('houses', 'lg') : '') + 'Community Hub',   /* A1 (P01.14): drawn, not emoji */""")
s = one(s,
"""var partners = makeOpt('cr-nav-communitypartners',
'\\uD83E\\uDD1D Community Partners',""",
"""var partners = makeOpt('cr-nav-communitypartners',
(window.CardinalIcons ? window.CardinalIcons.get('group', 'lg') : '') + 'Community Partners',""")
s = one(s,
"""var prospects = makeOpt('cr-nav-communityprospects',
'\\uD83C\\uDF31 Prospective Partners',""",
"""var prospects = makeOpt('cr-nav-communityprospects',
(window.CardinalIcons ? window.CardinalIcons.get('funnel', 'lg') : '') + 'Prospective Partners',""")
s = one(s,
"""var health  = makeOpt('cr-nav-health',
'\\uD83E\\uDE7A Health Check',""",
"""var health  = makeOpt('cr-nav-health',
(window.CardinalIcons ? window.CardinalIcons.get('alarm', 'lg') : '') + 'Health Check',""")
s = one(s,
"""var ownerOpt = makeOpt('cr-nav-owner', '\\uD83D\\uDCCB Owner Console',""",
"""var ownerOpt = makeOpt('cr-nav-owner', (window.CardinalIcons ? window.CardinalIcons.get('scales', 'lg') : '') + 'Owner Console',""")
s = one(s,
"""btn.innerHTML = '\\uD83D\\uDCCB Line Item Library';""",
"""btn.innerHTML = (window.CardinalIcons ? window.CardinalIcons.get('box', 'lg') : '') + 'Line Item Library';   /* A1 (P01.14): drawn, not emoji */""")
s = one(s,
"""btn.innerHTML = '\\uD83E\\uDD1D Community Partners';""",
"""btn.innerHTML = (window.CardinalIcons ? window.CardinalIcons.get('group', 'lg') : '') + 'Community Partners';   /* A1: the 953 row's own glyph */""")
s = one(s,
"""btn.innerHTML = ICO('camera') + ' Import from AccuLynx';""",
"""btn.innerHTML = ICO('save') + ' Import from AccuLynx';   /* A1 (P06.03): an arrow into a tray, not a camera — Quick Inspection is the camera */""")

# static drawer rows: the six shared-glyph pairs get distinct existing glyphs
for a, b in [
    ('<button class="navopt" data-nav="quickinsp" data-cri="bolt lg">Quick Inspection</button>',
     '<button class="navopt" data-nav="quickinsp" data-cri="camera lg">Quick Inspection</button>'),
    ('<button class="navopt" data-nav="adjusters" data-cri="group lg">Adjuster Directory</button>',
     '<button class="navopt" data-nav="adjusters" data-cri="person lg">Adjuster Directory</button>'),
    ('<button class="navopt" data-nav="claimstracker" data-cri="clipboard lg">Claims Tracker</button>',
     '<button class="navopt" data-nav="claimstracker" data-cri="flag lg">Claims Tracker</button>'),
    ('<button class="navopt" data-nav="prodboard" data-cri="hardhat lg">Production Board</button>',
     '<button class="navopt" data-nav="prodboard" data-cri="factory lg">Production Board</button>'),
    ('<button class="navopt" data-nav="dispatch" data-cri="calendar lg">Crew Dispatch</button>',
     '<button class="navopt" data-nav="dispatch" data-cri="truck lg">Crew Dispatch</button>'),
    ('<button class="navopt" data-nav="newbid" data-cri="money lg">New Estimate</button>',
     '<button class="navopt" data-nav="newbid" data-cri="pencil lg">New Estimate</button>'),
    ('<button class="navopt" data-nav="feed" data-cri="bolt lg">Activity Feed</button>',
     '<button class="navopt" data-nav="feed" data-cri="cards lg">Activity Feed</button>'),
    ('<button class="navopt" data-nav="laborrates" data-cri="clipboard lg">Labor Rate Schedule</button>',
     '<button class="navopt" data-nav="laborrates" data-cri="ruler lg">Labor Rate Schedule</button>'),
    ('<button class="navopt" data-nav="ar" data-cri="cash lg">Invoices &amp; AR</button>',
     '<button class="navopt" data-nav="ar" data-cri="contract lg">Invoices &amp; AR</button>'),
    # the banner menus carry the same destinations: same glyph for the same place
    ('<span class="cbi" data-go="prodboard" data-cri="hardhat lg">Production Board</span><span class="cbi" data-go="dispatch" data-cri="calendar lg">Crew Dispatch</span>',
     '<span class="cbi" data-go="prodboard" data-cri="factory lg">Production Board</span><span class="cbi" data-go="dispatch" data-cri="truck lg">Crew Dispatch</span>'),
    ('<span class="cbi" data-go="adjusters" data-cri="group lg">Adjuster Directory</span>',
     '<span class="cbi" data-go="adjusters" data-cri="person lg">Adjuster Directory</span>'),
]:
    s = one(s, a, b)

# ─────────────────────────────────────────────────────────────── P01.08
s = one(s,
"""btn.innerHTML = '\\uD83E\\uDE7A Self Check';""",
"""btn.innerHTML = (window.CardinalIcons ? window.CardinalIcons.get('pulse', 'lg') : '') + 'Self Check';   /* A1: the Tools menu's glyph */""")
s = one(s,
"""openAndRun();
};
if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
else menu.appendChild(btn);
return true;
}""",
"""openAndRun();
};
if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
else {
/* A1 (P01.08): no Admin rows (a rep, a production account) — append landed it under the build
   stamp. With the last section's rows instead: before the Text size row, else before the footer. */
var below = menu.querySelector(':scope > .cr-ts') || menu.querySelector(':scope > [data-cr-footer]');
if(below) menu.insertBefore(btn, below); else menu.appendChild(btn);
}
return true;
}""")
s = one(s,
"""'<h3>\\uD83E\\uDE7A Self Check</h3>' +""",
"""'<h3>' + (window.CardinalIcons ? window.CardinalIcons.get('pulse', 'crico') : '') + 'Self Check</h3>' +""")
s = one(s,
"""var results = [];
try{ results = await collect(); }
finally{
panel.style.visibility = '';
panel.classList.add('open');""",
"""var results = [];
/* A1 (P01.08): collect() opens five screens and each records a history entry — a rep ended a run four
   entries deep, on 'salesfloor', and one Back walked into Production. For the run, a push replaces the
   entry it started on and the legacy {v:...} pushes are held (__histLock, the 1037 lock navRestore uses);
   afterwards that entry is put back exactly as it was, so the run leaves history as it found it. */
var st0 = history.state, url0 = location.href, push0 = history.pushState, lock0 = false;
try{ lock0 = __histLock; history.pushState = function(st, t, u){ return history.replaceState(st, t, u); }; __histLock = true; }catch(_h){}
try{ results = await collect(); }
finally{
try{ history.pushState = push0; history.replaceState(st0, '', url0); __histLock = lock0; }catch(_h2){}
panel.style.visibility = '';
panel.classList.add('open');""")

# ─────────────────────────────────────────────────────────────── J15.02
s = one(s,
""".pbnavico,
#navMenu .pbnavico{ width:17px; height:17px; flex:none; vertical-align:-3px; margin-right:7px; }""",
""".pbnavico,
#navMenu .pbnavico{ width:17px; height:17px; flex:none; vertical-align:-3px; margin-right:.12em; }   /* A1 (J15.02): was 7px — the drawer's own .cri.lg spacing, so "Production" starts where its siblings do */""")

# ─────────────────────────────────────────────────── J15.03 / P06.05 (fonts)
# the header + is #cr-hd2-bar .cr-ib.primary: edited in place (that rule already carries its --cr-stack reason)
s = one(s,
"""#cr-hd2-bar .cr-ib.primary{--cr-stack:"J16 edited in place (the + reads the CRM identity hue); it already won these";background:""",
"""#cr-hd2-bar .cr-ib.primary{--cr-stack:"J16 edited in place (the + reads the CRM identity hue); it already won these";font-family:inherit;background:""")
s = one(s,
"""#cr-lnav .lnav-item{display:flex;align-items:center;gap:10px;width:100%;
  background:none;border:0;border-left:3px solid transparent;cursor:pointer;""",
"""#cr-lnav .lnav-item{display:flex;align-items:center;gap:10px;width:100%;font-family:inherit;   /* A1 (J15.03): a <button> keeps the browser's control font otherwise */
  background:none;border:0;border-left:3px solid transparent;cursor:pointer;""")
s = one(s,
"""#cr-cc .cc-jmb{display:flex;align-items:center;justify-content:space-between;gap:10px;""",
"""#cr-cc .cc-jmb{font-family:inherit;display:flex;align-items:center;justify-content:space-between;gap:8px;""")
# ^ gap 10 -> 8: the app sans sets the tile labels ~2px wider than the browser's control Arial, and the
#   1fr tracks are min-content sized, so at 390 the grid ran 1.6px past the 16px gutter (gate_1418 X).
s = one(s,
"""#cr-cc .cc-jmb .n{font:700 13px ui-monospace,Menlo,monospace;color:var(--warn,#ffcf6b)}""",
"""#cr-cc .cc-jmb .n{font-weight:700;font-size:13px;font-variant-numeric:tabular-nums;color:var(--warn,#ffcf6b)}""")

# ─────────────────────────────────────────── J16.06 (V5): pressed toggles
s = one(s,
"""#navMenu .cr-ts button[aria-pressed="true"]{background:var(--lnav-crmc,#c8202e);
  border-color:var(--lnav-crmc,#c8202e);color:#fff;}""",
"""#navMenu .cr-ts button[aria-pressed="true"]{background:var(--lnav-crmc,#c8202e);
  border-color:var(--lnav-crmc,#c8202e);color:#fff;}
/* A1 (J16.06): --lnav-crmc is set on #cr-lnav only, and #navMenu is not inside it, so the pressed
   A / Dark / Light fell back to red in every portal. The rail's own CRM_COLOR map, keyed the way the
   rail keys it (data-crm-head). Community, production and sales are bright accents that white cannot
   sit on (1.92 / 2.03 / 3.6:1), so they take the rail's own deepened twins (CRM_INK_LT). White on
   each, computed: retail #3e6ca8 5.36 · insurance #c8202e 5.67 · community #047857 5.48 ·
   production #96560c 5.78 · sales #b23730 6.03; Sun light darkens each 20% (7.47-8.27).
   1441: RETAIL is left on the red fallback (#c8202e, 5.67:1) — the rail's slate #3e6ca8 would change
   Retail's look, which is a colour call held for Theo. */
body[data-crm-head="insurance"] #navMenu{--lnav-crmc:#c8202e}
body[data-crm-head="community"] #navMenu{--lnav-crmc:#047857}
body[data-crm-head="production"] #navMenu{--lnav-crmc:#96560c}
body[data-crm-head="sales"] #navMenu{--lnav-crmc:#b23730}""")

# ─────────────────────────────────────────────────── P06.08 / J15.10 emoji
s = one(s,
"""b.innerHTML = '<span>\\uD83D\\uDCD6</span> TOC';""",
"""b.innerHTML = '<span>' + (window.CardinalIcons ? window.CardinalIcons.get('books') : '') + '</span> TOC';   /* A1 (P06.08): drawn, not emoji */""")
s = one(s,
"""b.innerHTML = '<span>\\uD83D\\uDEE0</span> Manage';""",
"""b.innerHTML = '<span>' + (window.CardinalIcons ? window.CardinalIcons.get('pencil') : '') + '</span> Manage';   /* A1 (P06.08): drawn, not emoji */""")
s = one(s,
"""      btn.innerHTML = '&#129302; Ask / File';""",
"""      btn.innerHTML = (window.CardinalIcons ? window.CardinalIcons.get('sparkle') : '') + ' Ask / File';   /* A1 (P06.08): drawn, not emoji */""")
s = one(s,
"""            <button class="estopt" data-ctpl="roof">&#127968; Roofing agreement</button>
            <button class="estopt" data-ctpl="siding">&#129521; Siding agreement</button>
            <button class="estopt" data-ctpl="gutters">&#127783; Gutter agreement</button>""",
"""            <button class="estopt" data-ctpl="roof">Roofing agreement</button>
            <button class="estopt" data-ctpl="siding">Siding agreement</button>
            <button class="estopt" data-ctpl="gutters">Gutter agreement</button>""")
s = one(s,
"""    var ic = a.kind === 'drop' ? '\\uD83D\\uDE9A' : (a.kind === 'job' ? '\\uD83D\\uDD28' : '\\uD83D\\uDCC5');""",
"""    var ic = (KIND_META[a.kind || 'appt'] || KIND_META.appt).ic;   /* A1 (P06.08): the board's drawn kind glyph, not emoji */""")

# ─────────────────────────────────────────────────────────────── P08.06
s = one(s,
"""          <option value="appt">&#128197; Appointment</option>
          <option value="job">&#128296; Job</option>
          <option value="drop">&#128666; Material Drop</option>
          <option value="team">&#127970; Team &#8212; meeting / vacation / PTO</option>""",
"""          <option value="appt">Appointment</option>
          <option value="job">Job</option>
          <option value="drop">Material Drop</option>
          <option value="team">Team &#8212; meeting / vacation / PTO</option>""")
s = one(s,
"""  document.getElementById('apptDayTitle').textContent = '\\uD83D\\uDCC5 ' +
    new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10))
      .toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });""",
"""  document.getElementById('apptDayTitle').innerHTML = crIco('calendar') +   /* A1 (P08.06): drawn, not emoji */
    esc(new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10))
      .toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }));""")
s = one(s,
"""      '<span class="bd"><b>' + esc(a.title) + '</b>' +
        ((pr || a.notes || a.created_by) ? '<small>' +
          (pr ? esc(pr.name) : '') +
          (a.notes ? (pr ? ' \\u00b7 ' : '') + esc(a.notes) : '') +
          (a.created_by ? ' \\u00b7 ' + esc(a.created_by.split('@')[0]) : '') + '</small>' : '') +""",
"""      '<span class="bd"><b>' + esc(a.title) + '</b>' +
        /* A1 (P08.06): the kind leads the line — the board card shows it, this list did not */
        '<small>' + esc((KIND_META[a.kind || 'appt'] || KIND_META.appt).nm) +
          (pr ? ' \\u00b7 ' + esc(pr.name) : '') +
          (a.notes ? ' \\u00b7 ' + esc(a.notes) : '') +
          (a.created_by ? ' \\u00b7 ' + esc(a.created_by.split('@')[0]) : '') + '</small>' +""")

# ─────────────────────────────────────────────────────────────── P08.12
s = one(s,
"""<div class="pu-srch">&#128269; <input type="search" id="puSearch" placeholder="Client, address, PO # or item" aria-label="Search punch items"></div>""",
"""<div class="pu-srch" data-cri="search"><input type="search" id="puSearch" placeholder="Client or PO #" aria-label="Search punch items"></div>""")

# ─────────────────────────────────────────────────────────────── P12.02
s = one(s,
"""  else if(list.length > 1) crTell('Uploaded ' + list.length + ' work orders.');""",
"""  else if(list.length > 1) crTell('Uploaded ' + list.length + ' work orders.', 'ok');""")
s = one(s,
"""crTell('Imported ' + newSeries + ' new series and ' + newArticles + ' new articles.\\n' +
'The hardcoded copies are now hidden — DB versions take over.');""",
"""crTell('Imported ' + newSeries + ' new series and ' + newArticles + ' new articles.\\n' +
'The hardcoded copies are now hidden — DB versions take over.', 'ok');""")
s = one(s,
"""if(j && j.ok){ crTell('Texted the pay link to ' + (pr.name || 'the client') + '.'); markInvoiceSent(pr.id); }""",
"""if(j && j.ok){ crTell('Texted the pay link to ' + (pr.name || 'the client') + '.', 'ok'); markInvoiceSent(pr.id); }""")

# ─────────────────────────────────────────────────────────────── P12.09
# every crAsk whose question leads with no verb in leadVerb()'s list, and passed no verb, said "Continue"
ASK = [
    # (old call text, opts to append)
    ("""renderOverview(); renderPipeline();
    if(nx === 'Completed' && !parseCkAll(pr).review_requested_at && (pr.phone || pr.email)){
      setTimeout(async function(){
        if(await crAsk('\\uD83C\\uDF89 Job completed! Send ' + (pr.name || 'the client') + ' a Google review request now?')){""",
     """renderOverview(); renderPipeline();
    if(nx === 'Completed' && !parseCkAll(pr).review_requested_at && (pr.phone || pr.email)){
      setTimeout(async function(){
        if(await crAsk('Job completed! Send ' + (pr.name || 'the client') + ' a Google review request now?', { verb:'Send request', cancel:'Not now', tone:'plain' })){"""),
    ("""    if(normStage(pr.stage) === 'Completed' && !parseCkAll(pr).review_requested_at && (pr.phone || pr.email)){
      setTimeout(async function(){
        if(await crAsk('\\uD83C\\uDF89 Job completed! Send ' + (pr.name || 'the client') + ' a Google review request now?')){""",
     """    if(normStage(pr.stage) === 'Completed' && !parseCkAll(pr).review_requested_at && (pr.phone || pr.email)){
      setTimeout(async function(){
        if(await crAsk('Job completed! Send ' + (pr.name || 'the client') + ' a Google review request now?', { verb:'Send request', cancel:'Not now', tone:'plain' })){"""),
    ("""'. Make another one for the ' + fmtMoney(fin.balance, true) + ' still owed?')) return;""",
     """'. Make another one for the ' + fmtMoney(fin.balance, true) + ' still owed?', { verb:'Make another', cancel:'Cancel' })) return;"""),
    ("""crAsk((dir > 0 ? 'Advance' : 'Move back') + ' to ' + next.toUpperCase() + '?')""",
     """crAsk((dir > 0 ? 'Advance' : 'Move back') + ' to ' + next.toUpperCase() + '?', { verb: dir > 0 ? 'Advance' : 'Move back' })"""),
    ("""crAsk('Filed.\\n\\nRead it now and fill in the carrier, claim number and the RCV/ACV figures?\\n\\nFiling alone does not update the claim.')""",
     """crAsk('Filed.\\n\\nRead it now and fill in the carrier, claim number and the RCV/ACV figures?\\n\\nFiling alone does not update the claim.', { verb:'Read it now', cancel:'Later' })"""),
    ("""crAsk('Scan ' + targets.length + ' document(s) missing a dollar total and fill them in from the document contents?')""",
     """crAsk('Scan ' + targets.length + ' document(s) missing a dollar total and fill them in from the document contents?', { verb:'Scan and fill in' })"""),
    ("""crAsk('This job already has money logged. Move the sales rep anyway?\\nExisting commissions keep their rep; only future collections follow the new one.')""",
     """crAsk('This job already has money logged. Move the sales rep anyway?\\nExisting commissions keep their rep; only future collections follow the new one.', { verb:'Move the rep', cancel:'Keep the rep' })"""),
    ("""                 'Enter a total first, or send it anyway?');""",
     """                 'Enter a total first, or send it anyway?', { verb:'Send anyway', cancel:'Enter a total first' });"""),
    ("""crAsk('Sent. Schedule a follow-up reminder in 3 days?')""",
     """crAsk('Sent. Schedule a follow-up reminder in 3 days?', { verb:'Remind me in 3 days', cancel:'No reminder' })"""),
    ("""crAsk('Last check \\u2014 this cannot be undone. Reset now?')""",
     """crAsk('Last check \\u2014 this cannot be undone. Reset now?', { verb:'Reset now', cancel:'Keep it', tone:'danger' })"""),
    ("""' not synced yet and will be lost if you sign out now.\\n\\nSign out anyway?')""",
     """' not synced yet and will be lost if you sign out now.\\n\\nSign out anyway?', { verb:'Sign out anyway', cancel:'Stay signed in', tone:'danger' })"""),
    ("""'Non-profits: Habitat, ReBuild, DHRN\\n' +
'Property managers: Kitty Hawk Realty'
);""",
     """'Non-profits: Habitat, ReBuild, DHRN\\n' +
'Property managers: Kitty Hawk Realty',
{ verb:'Attach a partner', cancel:'Not now' }
);"""),
    ("""crAsk('Reassign ' + selected.size + ' client(s) to ' + email + '?')""",
     """crAsk('Reassign ' + selected.size + ' client(s) to ' + email + '?', { verb:'Reassign' })"""),
    ("""'If you only want them out of the way, use Archive instead.'
)) return;""",
     """'If you only want them out of the way, use Archive instead.',
{ verb:'Delete permanently', cancel:'Keep them', tone:'danger' }
)) return;"""),
    ("""'Duplicates (matching slug for series, matching title for articles) will be skipped, so it\\'s safe to run.'
)) return;""",
     """'Duplicates (matching slug for series, matching title for articles) will be skipped, so it\\'s safe to run.',
{ verb:'Import' }
)) return;"""),
    ("""ask('Throw away the ' + shots.length + ' photo' + (shots.length === 1 ? '' : 's') + ' you took? They have not been uploaded.')""",
     """ask('Throw away the ' + shots.length + ' photo' + (shots.length === 1 ? '' : 's') + ' you took? They have not been uploaded.', { verb:'Throw away', cancel:'Keep them', tone:'danger' })"""),
    ("""'Generate a contract from it anyway?'
);""",
     """'Generate a contract from it anyway?',
{ verb:'Generate contract' }
);"""),
    ("""'Move ' + (project.name || 'this client') + ' to ' +
displayStage('Lost') + '?'
);""",
     """'Move ' + (project.name || 'this client') + ' to ' +
displayStage('Lost') + '?',
{ verb:'Move to ' + displayStage('Lost'), cancel:'Not now' }
);"""),
    ("""crAsk('Not finished yet.\\n\\nBack on this tomorrow?')""",
     """crAsk('Not finished yet.\\n\\nBack on this tomorrow?', { verb:'Back on it tomorrow', cancel:'Not now', tone:'plain' })"""),
    ("""crAsk('Take this off the list?\\n\\n' + (tk[i].t || ''))""",
     """crAsk('Take this off the list?\\n\\n' + (tk[i].t || ''), { verb:'Take it off', cancel:'Keep it' })"""),
    ("""crAsk('Take this job OFF the waitlist? The tarp date stays on the record.')""",
     """crAsk('Take this job OFF the waitlist? The tarp date stays on the record.', { verb:'Take it off', cancel:'Keep it' })"""),
    ("""crAsk('Amount saved. Also move this job to ' + (LABEL['Prospect'] || 'Estimate Submitted') + '?')""",
     """crAsk('Amount saved. Also move this job to ' + (LABEL['Prospect'] || 'Estimate Submitted') + '?', { verb:'Move it', cancel:'Not now' })"""),
    ("""crAsk('Assign '+ids.length+' client'+(ids.length===1?'':'s')+' to the '+portal+' portal?')""",
     """crAsk('Assign '+ids.length+' client'+(ids.length===1?'':'s')+' to the '+portal+' portal?', { verb:'Assign' })"""),
    ("""              'This only rearranges the report you are editing. Nothing is sent to the client.')) return;""",
     """              'This only rearranges the report you are editing. Nothing is sent to the client.', { verb:'Sort photos' })) return;"""),
    ("""        'discard the changes you have not saved?')) return;""",
     """        'discard the changes you have not saved?', { verb:'Discard and ask again', cancel:'Keep my changes', tone:'danger' })) return;"""),
    ("""crAsk('That is ' + money(amt) + ', but the balance is ' + money(Math.max(0, _bal)) + '. Record it anyway?')""",
     """crAsk('That is ' + money(amt) + ', but the balance is ' + money(Math.max(0, _bal)) + '. Record it anyway?', { verb:'Record anyway' })"""),
    ("""        '.\\n\\nComplete the job anyway? You will be asked why, and it goes on the job’s Owner Review.')""",
     """        '.\\n\\nComplete the job anyway? You will be asked why, and it goes on the job’s Owner Review.', { verb:'Complete anyway' })"""),
]
for a, b in ASK:
    s = one(s, a, b)

pl.write_atomic(P, s)
print('patch_1441_shell applied:', P)
