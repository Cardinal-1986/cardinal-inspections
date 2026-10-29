#!/usr/bin/env python3
"""patch_H.py <in.html> <out.html> -- Builder H's fixes on top of build 1428.

Grouped by the round-1 meta report's item numbers (meta_report.md section 2).
Every edit is exact-match through patch_lib.sub (asserts the count, aborts
before any write) and the output is written atomically. Re-running on the same
input reproduces the output byte for byte.

  #13  contract viewer: title ink pinned to its own (always dark) header,
       red labels on the dark bar lifted to #e35c63, every action 44px
  #18  ONE lead-source vocabulary for the New Lead form and the client page;
       the client page reads old spellings and imported values (no data rewrite)
  #19  inspection checklist: required fields starred, a failed save scrolls to
       and focuses the first missing field, the message sits above the buttons
  #26  a lead saved with no address stores '' instead of ', , OH '
  #27  + New / + Add punch-out: the rep picks the job, or it is the job on screen
  #32  the two remaining "OK = ..." prompts say what their buttons say
  #33  Activity feed: appointment dates through fmtDay(), not the raw ISO
  #34  emoji -> drawn icons: Quick Inspection Who tabs, contract action bar,
       the Supplement card heading

Not touched here (do not reproduce on 1428, see the report): #25 Buttons A on
the Estimates tab (fixed 1424), #28 invoices on the Inspections tab (1423 gave
them their own heading), #30 the Supplement letter (index.html has no printed
supplement letter; the only one is supplement.html's #printArea).
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

if len(sys.argv) != 3:
    print(__doc__); sys.exit(2)
SRC, OUT = sys.argv[1], sys.argv[2]
src = pl.load(SRC)
orig = src

# ════════════════════════════════════════════════════════════════════════════
# #13 — the contract viewer (cr-ce-styles / cr-ce-script)
# ════════════════════════════════════════════════════════════════════════════
# The header paints #1a0f0c → #241512 in BOTH themes. Its title read
# var(--rbe-head,#ffffff), a token that flips to #161616 under rb-light, so in
# light it was dark ink on a dark ground: 1.04:1. A flipping token on a ground
# that does not flip is the defect itself, so the ink is pinned to the value it
# already had in dark (#ffffff, 17.6:1). The eyebrow and the action labels were
# #c8202e at 11px on the dark header/bar (3.11 and 3.05:1); #e35c63 is the
# lighter red this same stylesheet already uses (.ce-status.draft, the
# primary's hover) and reads 5.0-5.35:1. Sign (and every action) was 32px.
src = pl.sub(src,
    "text-transform:uppercase;color:#c8202e;opacity:.9}#cr-ce-view .ce-header h1{margin:2px 0 0;font:700 22px Georgia,'Times New Roman',serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--rbe-head,#ffffff);/* 685: was gradient-clipped text */}",
    "text-transform:uppercase;color:#e35c63}#cr-ce-view .ce-header h1{margin:2px 0 0;font:700 22px Georgia,'Times New Roman',serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#ffffff;/* 685: was gradient-clipped text. H (#13): the header is dark in BOTH themes, so its ink is pinned too; --rbe-head flips to #161616 in light and read 1.04:1 here */}")
# 44px buttons, and 10px sides with no flex gap (the drawn glyph carries its own .35em) so the bar
# stays two rows at 390px: 98px -> 122px, where 13px sides made it three rows and 174px.
src = pl.sub(src,
    "#cr-ce-view .ce-actions button{background:transparent;color:#c8202e;border:1px solid #c8202e;border-radius:8px;padding:8px 13px;cursor:pointer;font:800 11px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;display:inline-flex;align-items:center;gap:5px;",
    "#cr-ce-view .ce-actions button{background:transparent;color:#e35c63;border:1px solid #c8202e;border-radius:8px;padding:8px 10px;min-height:44px;cursor:pointer;font:800 11px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;display:inline-flex;align-items:center;gap:0;")
# the Ask button sat on the bar's right-hand buttons; the viewer joins the 1397 list of screens
# with their own bottom actions, which tucks it (written only on a change, as before).
src = pl.sub(src,
    "return open('cr-est-view') || open('editorView') || open('cr-scan') || shown('commsView') || shown('qiStartView') || shown('resourceLibraryView');",
    "return open('cr-est-view') || open('editorView') || open('cr-scan') || open('cr-ce-view') || shown('commsView') || shown('qiStartView') || shown('resourceLibraryView');   /* H (#13): + the contract viewer */")

# #34 (contract action bar): the five emoji become the drawn glyphs the
# document editor's own toolbar uses for the same actions (page = Print / PDF,
# save = Download, paperclip = Share link, mail = Email, pencil = signature).
src = pl.sub(src,
    "return '<div class=\"ce-actions\">' +\n"
    "'<button data-act=\"print\">\\uD83D\\uDDA8 Print</button>' +\n"
    "'<button data-act=\"download\">\\u2B07 Download</button>' +\n"
    "(contract.share_token\n"
    "? '<button data-act=\"copy\">\\uD83D\\uDD17 Copy Link</button>' +\n"
    "'<button data-act=\"mail\" class=\"primary\">\\u2709 Send by Email</button>'\n"
    ": '') +\n"
    "(_canSend ? '<button data-act=\"send\">\\u2709 Mark sent</button>' : '') +\n"
    "(_canSign ? '<button data-act=\"sign\" class=\"primary\">\\u270D Sign</button>' : '') +",
    "/* H (#34): drawn glyphs, not emoji -- the editor toolbar's own choices for the same actions */\n"
    "var _ceIco = function(n){ return window.crIco ? window.crIco(n) : ''; };\n"
    "return '<div class=\"ce-actions\">' +\n"
    "'<button data-act=\"print\">' + _ceIco('page') + 'Print</button>' +\n"
    "'<button data-act=\"download\">' + _ceIco('save') + 'Download</button>' +\n"
    "(contract.share_token\n"
    "? '<button data-act=\"copy\">' + _ceIco('paperclip') + 'Copy Link</button>' +\n"
    "'<button data-act=\"mail\" class=\"primary\">' + _ceIco('mail') + 'Send by Email</button>'\n"
    ": '') +\n"
    "(_canSend ? '<button data-act=\"send\">' + _ceIco('mail') + 'Mark sent</button>' : '') +\n"
    "(_canSign ? '<button data-act=\"sign\" class=\"primary\">' + _ceIco('pencil') + 'Sign</button>' : '') +")

# ════════════════════════════════════════════════════════════════════════════
# #18 — lead source: one vocabulary, and the client page reads every stored value
# ════════════════════════════════════════════════════════════════════════════
# Three lists existed: the Add-project chips and the client page's select (the
# same eight, kept in step since 999) and the New Lead form's nineteen, which
# spelled three of the same sources differently (Door Knocking / Yard Sign /
# Previous Customer) and carried fourteen the client page did not list. A lead
# saved as "Door Knocking" therefore showed "—" on its own page.
# Now: ONE list (the eight first, in their settled order, then the New Lead
# form's fourteen others, Other last). The New Lead select is filled from it at
# parse time, so the two cannot drift again. Nothing stored is rewritten: the
# client page maps the three old spellings to their entry on DISPLAY, and any
# other stored value it does not know (e.g. "AccuLynx import") is shown as an
# extra option instead of a blank. The reports bucket through the same map.
src = pl.sub(src,
    "function acxOpts(list, cur){",
    "/* H (#18): the ONE lead-source vocabulary (see patch note above acxSrcOpts) */\n"
    "var CR_LEAD_SOURCES = ['Door knock','Referral','Google / website','Yard sign','Repeat customer','Storm canvass','Facebook / social',\n"
    "  'Canvasser','Commercial','Direct Mailings','Door hanger','Habitat - Dayton','Internet','Internet: Google','Internet: Website',\n"
    "  'Non Profit','Real-estate','Real-estate: Kitty Hawk','Roofle','Telemarketing','Truck','Other'];\n"
    "/* the New Lead form's old spellings of three of the same sources (case is matched separately) */\n"
    "var CR_LEAD_SOURCE_ALIAS = { 'door knocking':'Door knock', 'previous customer':'Repeat customer' };\n"
    "/* a stored lead_source as the vocabulary spells it; anything it does not know comes back as stored */\n"
    "function crLeadSource(v){\n"
    "  var s = String(v == null ? '' : v).trim();\n"
    "  if(!s) return '';\n"
    "  var k = s.toLowerCase();\n"
    "  if(Object.prototype.hasOwnProperty.call(CR_LEAD_SOURCE_ALIAS, k)) return CR_LEAD_SOURCE_ALIAS[k];\n"
    "  for(var i = 0; i < CR_LEAD_SOURCES.length; i++){ if(CR_LEAD_SOURCES[i].toLowerCase() === k) return CR_LEAD_SOURCES[i]; }\n"
    "  return s;\n"
    "}\n"
    "/* H (#18): the client page's Lead Source options. A value the list does not carry is shown as it is\n"
    "   stored (escaped) and selected, so a real source never renders as the blank dash. Display only:\n"
    "   the field is written when the select CHANGES, never by drawing it. */\n"
    "function acxSrcOpts(cur){\n"
    "  var c = crLeadSource(cur);\n"
    "  return acxOpts(CR_LEAD_SOURCES, c) + (c && CR_LEAD_SOURCES.indexOf(c) === -1 ? '<option selected>' + esc(c) + '</option>' : '');\n"
    "}\n"
    "(function(){\n"
    "  var sel = document.getElementById('ldSource');\n"
    "  if(!sel) return;\n"
    "  sel.innerHTML = '<option value=\"\">\\u2014 select \\u2014</option>' + CR_LEAD_SOURCES.map(function(o){ return '<option>' + esc(o) + '</option>'; }).join('');\n"
    "})();\n"
    "function acxOpts(list, cur){")
src = pl.sub(src,
    "acxOpts(['Door knock','Referral','Google / website','Yard sign','Repeat customer','Storm canvass','Facebook / social','Other'], ck.lead_source)",
    "acxSrcOpts(ck.lead_source)")
# the New Lead form's static list: emptied to its placeholder; the main block fills it from CR_LEAD_SOURCES
src = pl.sub(src,
    "<select id=\"ldSource\"><option value=\"\">&#8212; select &#8212;</option>\n"
    "            <option>Canvasser</option><option>Commercial</option><option>Direct Mailings</option>\n"
    "            <option>Door hanger</option><option>Door Knocking</option><option>Habitat - Dayton</option>\n"
    "            <option>Internet</option><option>Internet: Google</option><option>Internet: Website</option>\n"
    "            <option>Non Profit</option><option>Other</option><option>Previous Customer</option>\n"
    "            <option>Real-estate</option><option>Real-estate: Kitty Hawk</option><option>Referral</option>\n"
    "            <option>Roofle</option><option>Telemarketing</option><option>Truck</option><option>Yard Sign</option></select></label>",
    "<select id=\"ldSource\"><option value=\"\">&#8212; select &#8212;</option></select></label>\n"
    "          <!-- H (#18): its options are CR_LEAD_SOURCES, filled by the main block -- the same list the client page offers -->")
# reports: one bucket per source, whichever spelling stored it (read-only)
src = pl.sub(src,
    "if(srcF && (rptCk(pr).lead_source || '') !== srcF) return false;",
    "if(srcF && crLeadSource(rptCk(pr).lead_source) !== srcF) return false;   /* H (#18) */")
src = pl.sub(src,
    "cacheProjects.forEach(function(pr){ var s = rptCk(pr).lead_source; if(s) sources[s] = 1; });",
    "cacheProjects.forEach(function(pr){ var s = crLeadSource(rptCk(pr).lead_source); if(s) sources[s] = 1; });")
src = pl.sub(src,
    "projs.forEach(function(p){ var s = rptCk(p).lead_source; if(s) srcCounts[s] = (srcCounts[s]||0)+1; });",
    "projs.forEach(function(p){ var s = crLeadSource(rptCk(p).lead_source); if(s) srcCounts[s] = (srcCounts[s]||0)+1; });")

# ════════════════════════════════════════════════════════════════════════════
# #19 — the inspection checklist's "Save and start report"
# ════════════════════════════════════════════════════════════════════════════
# Nine roof questions (and six general-inspection ratings) are required and
# none was marked; a refused save wrote its message at y=1817 of an 844px
# screen and nothing visible changed. Now: the app's one required mark
# (.cr-req, 741) and aria-required on each; a refused save outlines every
# missing field (crValid.mark), scrolls the first to the middle of the sheet,
# shakes and focuses it, and the message sits in the fixed footer above the
# buttons. Choosing an answer clears that field's outline.
src = pl.sub(src,
    "  var FACT = { 'Excellent':1.1, 'Good':1, 'Fair':0.85, 'Poor':0.65, 'Critical':0.4 };\n",
    "  var FACT = { 'Excellent':1.1, 'Good':1, 'Fair':0.85, 'Poor':0.65, 'Critical':0.4 };\n"
    "  /* H (#19): the general-inspection parts a save requires -- one list for the marks and the check */\n"
    "  var IG_GEN_REQ = ['roof','siding','soffit','fascia','gutters','windows'];\n")
src = pl.sub(src,
    "function igSel(path, label, opts, val){",
    "function igSel(path, label, opts, val, req){\n"
    "    var ar = req ? ' aria-required=\"true\"' : '';   /* H (#19) */")
src = pl.sub(src,
    "inner = '<input type=\"number\" inputmode=\"numeric\" min=\"0\" max=\"200\" id=\"' + id + '\" value=\"' + igEsc(val) + '\">';",
    "inner = '<input type=\"number\" inputmode=\"numeric\" min=\"0\" max=\"200\" id=\"' + id + '\"' + ar + ' value=\"' + igEsc(val) + '\">';")
src = pl.sub(src,
    "inner = '<select id=\"' + id + '\"><option value=\"\">— select —</option>' + list.map(function(o){",
    "inner = '<select id=\"' + id + '\"' + ar + '><option value=\"\">— select —</option>' + list.map(function(o){")
src = pl.sub(src,
    "return '<label class=\"ig-f\" data-f=\"' + igEsc(path) + '\">' + label + inner + '</label>';",
    "/* the label is a grid: the text and its mark share ONE item, or the mark would take a row of its own */\n"
    "    if(req) label = '<span>' + label + '<span class=\"cr-req\" aria-hidden=\"true\">*</span></span>';\n"
    "    return '<label class=\"ig-f\" data-f=\"' + igEsc(path) + '\">' + label + inner + '</label>';")
src = pl.sub(src,
    "var k = t.toLowerCase(); return igSel('general.' + k, t, GC, (a.general || {})[k] || ''); }).join('') + '</div>';",
    "var k = t.toLowerCase(); return igSel('general.' + k, t, GC, (a.general || {})[k] || '', IG_GEN_REQ.indexOf(k) !== -1); }).join('') + '</div>';")
src = pl.sub(src,
    "return igSel(f[0], f[1] + (f[0] === 'residential' && !a.residential && res ? ' <i>· from the job category</i>' : ''), f[2], v);",
    "return igSel(f[0], f[1] + (f[0] === 'residential' && !a.residential && res ? ' <i>· from the job category</i>' : ''), f[2], v, !!f[3]);")
src = pl.sub(src,
    "sheet.innerHTML = igTop('Checklist', true) + '<div class=\"ig-body\">' + h + '<p class=\"ig-err\" id=\"insgErr\"></p></div>' +\n"
    "      '<div class=\"ig-foot\"><button type=\"button\" class=\"ig-alt\" data-ig=\"skip\">Skip checklist</button>",
    "/* H (#19): this step's message lives in the fixed footer, above the buttons it answers */\n"
    "    sheet.innerHTML = igTop('Checklist', true) + '<div class=\"ig-body\">' + h + '</div>' +\n"
    "      '<div class=\"ig-foot\"><p class=\"ig-err\" id=\"insgErr\" role=\"alert\"></p><button type=\"button\" class=\"ig-alt\" data-ig=\"skip\">Skip checklist</button>")
src = pl.sub(src,
    "ROOF.forEach(function(f){ var v = igVal(f[0]); if(v === null) return; if(f[3] && !v) missing.push(f[1]); all[f[0]] = v; });\n"
    "      if(missing.length){ err.textContent = 'Still needed for the roof: ' + missing.join(', ') + '.'; return; }",
    "var missP = [];\n"
    "      ROOF.forEach(function(f){ var v = igVal(f[0]); if(v === null) return; if(f[3] && !v){ missing.push(f[1]); missP.push(f[0]); } all[f[0]] = v; });\n"
    "      if(missing.length){\n"
    "        igMiss(missP, 'Still needed for the roof: ' + (missing.length > 3 ? missing[0] + ' and ' + (missing.length - 1) + ' more, marked in red' : missing.join(', ')) + '.');\n"
    "        return;\n"
    "      }")
src = pl.sub(src,
    "var gm = ['roof','siding','soffit','fascia','gutters','windows'].filter(function(k){ return !g[k]; });\n"
    "      if(gm.length){ err.textContent = 'Rate every part of the general inspection (' + gm.length + ' left).'; return; }",
    "var gm = IG_GEN_REQ.filter(function(k){ return !g[k]; });\n"
    "      if(gm.length){ igMiss(gm.map(function(k){ return 'general.' + k; }), 'Rate every part of the general inspection (' + gm.length + ' left).'); return; }")
src = pl.sub(src,
    "      t.__noneWas = !!(none && none.selected);\n    }\n    igRefresh();\n  }",
    "      t.__noneWas = !!(none && none.selected);\n    }\n"
    "    /* H (#19): an answered field loses its outline; the last one clears the message */\n"
    "    if(t.classList && t.classList.contains('cr-bad') && String(t.value || '').trim() && window.crValid){\n"
    "      window.crValid.mark(t, true);\n"
    "      if(!sheet.querySelector('.cr-bad')){ var er = igEl('insgErr'); if(er) er.textContent = ''; }\n"
    "    }\n"
    "    igRefresh();\n  }\n"
    "  /* H (#19): a refused save names the fields AND shows them -- every missing one outlined, the first\n"
    "     brought to the middle of the sheet (clear of the sticky top and the fixed footer) and focused. */\n"
    "  function igMiss(paths, msg){\n"
    "    var err = igEl('insgErr'); if(err) err.textContent = msg;\n"
    "    var V = window.crValid, first = /** @type {any} */ (null);   /* typed: assigned inside the loop below */\n"
    "    paths.forEach(function(p){\n"
    "      var el = igEl('insg_' + p.replace('.', '_')); if(!el) return;\n"
    "      if(V) V.mark(el, false, 'Required'); if(!first) first = el;\n"
    "    });\n"
    "    if(!first) return;\n"
    "    try{ first.scrollIntoView({ block:'center' }); }catch(_){ try{ first.scrollIntoView(); }catch(_e){} }\n"
    "    if(V) V.shake(first);\n"
    "    try{ first.focus({ preventScroll:true }); }catch(_){ try{ first.focus(); }catch(_e){} }\n"
    "  }")
# the footer takes the message on a line of its own, and is hidden while empty
src = pl.sub(src,
    "#insgSheet .ig-foot{position:fixed;left:0;right:0;bottom:0;display:flex;gap:10px;justify-content:center;\n",
    "#insgSheet .ig-foot{position:fixed;left:0;right:0;bottom:0;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;\n")
src = pl.sub(src,
    "#insgSheet .ig-foot button{flex:1;max-width:300px;",
    "#insgSheet .ig-foot .ig-err{flex:1 0 100%;text-align:center;}   /* H (#19) */\n"
    "#insgSheet .ig-foot .ig-err:empty{display:none;}\n"
    "#insgSheet .ig-foot button{flex:1;max-width:300px;")
src = pl.sub(src,
    "#insgSheet .ig-body{max-width:620px;margin:0 auto;padding:14px 16px 120px;",
    "#insgSheet .ig-body{max-width:620px;margin:0 auto;padding:14px 16px 150px;")

# ════════════════════════════════════════════════════════════════════════════
# #26 — a lead with no address
# ════════════════════════════════════════════════════════════════════════════
# 1208 made the address optional and State defaults to OH, so a phone-in saved
# ', , OH ' as its address and the profile and Leads card printed it. The parts
# are joined only when there is one; with no street, suite, city or zip the
# address is '' and the profile says "No address on file". A full address
# comes out exactly as before ("9 Test Rd, Dayton, OH 45402").
src = pl.sub(src,
    "var addr = street + (suite ? ', ' + suite : '') + ', ' + city + ', ' + state + ' ' + zip;",
    "/* H (#26): only the parts there are -- no address at all is '', never ', , OH ' */\n"
    "  var addr = (street || suite || city || zip)\n"
    "    ? [street + (street && suite ? ', ' : '') + suite, city, (state + ' ' + zip).trim()].filter(Boolean).join(', ')\n"
    "    : '';")

# ════════════════════════════════════════════════════════════════════════════
# #27 — a punch-out landing on the wrong house
# ════════════════════════════════════════════════════════════════════════════
# The composer preselected the first job in its list, so a title typed and
# "Add it" tapped filed the item on whichever job sorted first. With no job
# given it now opens on "— pick a job —" (saveAdd already refuses an empty
# job with "Pick a job."). From the global + New while a client page is on
# screen, it opens on THAT job, which openAdd lists whatever its stage.
src = pl.sub(src,
    "'<select data-f=\"project\">' + (opts || '<option value=\"\">No jobs yet</option>') + '</select>' +",
    "/* H (#27): no job given = the rep picks one; the first in the list is not a default */\n"
    "    '<select data-f=\"project\">' + (opts ? ((presetProjectId && seen[String(presetProjectId)]) ? '' : '<option value=\"\" selected>\\u2014 pick a job \\u2014</option>') + opts\n"
    "                                         : '<option value=\"\">No jobs yet</option>') + '</select>' +")
src = pl.sub(src,
    "    openAdd(presetProjectId || null);\n  },",
    "    /* H (#27): from + New while a client page is on screen, the punch-out is for THAT job */\n"
    "    if(!presetProjectId){\n"
    "      try{\n"
    "        var _pv = document.getElementById('projectView'), _cp = window.currentProject;\n"
    "        if(_pv && _cp && _cp.id && getComputedStyle(_pv).display !== 'none') presetProjectId = _cp.id;\n"
    "      }catch(_){}\n"
    "    }\n"
    "    openAdd(presetProjectId || null);\n  },")

# ════════════════════════════════════════════════════════════════════════════
# #32 — prompts that say "OK = ..." over a sheet whose buttons say something else
# ════════════════════════════════════════════════════════════════════════════
# 1423 fixed the third (createReportFrom); these two remained. Same verbs as
# 1423 for the same question, and real verbs for the punch step.
src = pl.sub(src,
    "if(!await crAsk('No Roofing Inspection Checklist on file \\u2014 its baseline specs normally feed the report.\\n\\n' +\n"
    "                    'OK = create the report anyway (blank specs, fill by hand)\\nCancel = go complete the checklist first')){",
    "/* H (#32): the sheet's buttons say what happens (the 1423 wording for this same question) */\n"
    "        if(!await crAsk('No Roofing Inspection Checklist on file \\u2014 its baseline specs normally feed the report.\\n\\n' +\n"
    "                    'Create the report anyway and fill the specs by hand, or do the checklist first.',\n"
    "                    { verb: 'Create it anyway', cancel: 'Do the checklist first', tone: 'plain' })){")
src = pl.sub(src,
    "var req = await crAsk('Require a written note before this step can be ticked?\\n\\nOK = note required, Cancel = no note needed.');",
    "var req = await crAsk('Require a written note before this step can be ticked?',\n"
    "    { verb: 'Require a note', cancel: 'No note needed', tone: 'plain' });   /* H (#32): was \"OK = ... Cancel = ...\" */")

# ════════════════════════════════════════════════════════════════════════════
# #33 — the Activity feed printed "2026-10-29"
# ════════════════════════════════════════════════════════════════════════════
# fmtDay() is the main block's date-only formatter (crDate, so no day-early
# shift): "Oct 29, 2026", as the rest of the app prints a day.
src = pl.sub(src,
    "detail: ap.title + ' \\u2014 ' + ap.appt_date + (ap.appt_time ? ' ' + fmtApptTime(ap.appt_time) : '') });",
    "detail: ap.title + ' \\u2014 ' + (fmtDay(ap.appt_date) || ap.appt_date || '') + (ap.appt_time ? ' ' + fmtApptTime(ap.appt_time) : '') });   /* H (#33) */")

# ════════════════════════════════════════════════════════════════════════════
# #34 — the other leftover emoji
# ════════════════════════════════════════════════════════════════════════════
# Quick Inspection's Who tabs: the hydrated drawn icons (the drawer's own
# people / flag marks; `crico` gives the inline size and the gap).
src = pl.sub(src,
    "<button class=\"chipbtn\" id=\"qiTabExist\">&#128101; Existing client</button>",
    "<button class=\"chipbtn\" id=\"qiTabExist\" data-cri=\"people crico\">Existing client</button>")
src = pl.sub(src,
    "<button class=\"chipbtn\" id=\"qiTabNew\">&#128681; New prospect</button>",
    "<button class=\"chipbtn\" id=\"qiTabNew\" data-cri=\"flag crico\">New prospect</button>")
# and the two pins on the same screens (the panel judge's "My location", and the Who sheet's address
# line, which sits directly above the two tabs). The address is escaped now that it is markup.
src = pl.sub(src,
    "<button class=\"chipbtn\" id=\"qiLocBtn\">&#128205; My location</button>",
    "<button class=\"chipbtn\" id=\"qiLocBtn\" data-cri=\"pin crico\">My location</button>")
src = pl.sub(src,
    "document.getElementById('qiWhoAddr').textContent = qiAddr ? ('\\uD83D\\uDCCD ' + qiAddr) : '';",
    "document.getElementById('qiWhoAddr').innerHTML = qiAddr ? ((window.crIco ? crIco('pin') : '') + esc(qiAddr)) : '';   /* H (#34) */")
# the Supplement card heading: the drawn chart glyph (Graphs & Reports' own)
src = pl.sub(src,
    "'<span class=\"t\">\\uD83D\\uDCC8 Supplement</span>' +",
    "'<span class=\"t\">' + (window.crIco ? window.crIco('chart') : '') + 'Supplement</span>' +   /* H (#34) */")

assert src != orig
pl.write_atomic(OUT, src)
for marker in ["H (#13)", "acxSrcOpts(ck.lead_source)", "function igMiss(paths, msg){", "H (#26)", "H (#27)", "H (#32)", "H (#33)", "H (#34)"]:
    pl.assert_in(OUT, marker)
print('patch_H: wrote', OUT, len(src), 'chars (was', len(orig), ')')
