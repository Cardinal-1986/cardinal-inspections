#!/usr/bin/env python3
"""patch_A4 — thirteen round-1 leftovers on build 1438 (builder A4).

    python3 patch_A4.py <index.html>

P08.02 Dispatch at 390 · P08.03 Production home · P08.12 punch tabs at Large/Larger/Sun ·
P07.02 client name at Larger · P07.07 estimate x · P07.08 Ask over the end of Leads ·
P06.10/P10.04 the Library's floating controls · P12.05 punch-out job list · P12.06 Lead Source ·
P12.12 inspection photo note · P12.13 skip-checklist question · P12.15 appointments.
Does NOT bump the build stamp or add a CHANGELOG entry (the integrator does).
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1]
s = pl.load(P)


def one(s, a, b):
    n = s.count(a)
    assert n == 1, (n, a[:120])
    return s.replace(a, b, 1)


# ───────────────────────────── P08.02  Crew Dispatch at 390 ─────────────────────────────
# (a) the name: break-word, not anywhere (the width below is what actually stops "Samp/le")
s = one(s,
    "-webkit-line-clamp:2; overflow:hidden; overflow-wrap:anywhere; min-width:0;/* 991: the clamp lives on .nm",
    "-webkit-line-clamp:2; overflow:hidden; overflow-wrap:break-word; min-width:0;/* A4 (P08.02): break-word, was anywhere. 991: the clamp lives on .nm")
# (b) a chip that carries a grip says so, so the phone can give its foot row the grip's height
s = one(s,
    "return '<div class=\"job' + (String(armedMove) === String(w.id) ? ' moving' : '') + '\" data-pid=\"'",
    "return '<div class=\"job' + (String(armedMove) === String(w.id) ? ' moving' : '') + (grip ? ' hasmv' : '') + '\" data-pid=\"'")
# (c) below 1100px the pip and the grip leave the name's row for a row at the chip's foot
s = one(s,
    "#cr-disp .job.moving .mv{ color:var(--disp-need,#f5c045); }\n",
    "#cr-disp .job.moving .mv{ color:var(--disp-need,#f5c045); }\n"
    "/* A4 (P08.02, round-1 re-check on 1438): on a phone a chip is 91px and its name got 39px of\n"
    "   it — the pip and the grip shared the name's row — so \"Sample\" broke as \"Samp/le\" and the\n"
    "   grip's 44px pad (1040) owned the right 40% of the chip, name included. Below 1100px the pip\n"
    "   and the grip sit in a row of their own at the chip's foot and the name gets the chip's\n"
    "   whole width (73px; a word only breaks when it is wider than that). The pad is unchanged —\n"
    "   still 45x45 — it now covers the foot corner instead of the name. A chip with no grip (a\n"
    "   field user's, a finished job's) grows nothing: its pip sits at the end of the address line,\n"
    "   which keeps 12px for it. The desktop board is untouched. */\n"
    "@media (max-width:1099px){\n"
    "  #cr-disp .job .t .pip{ position:absolute; right:8px; bottom:9px; margin-left:0; --cr-stack:\"phone: the pip leaves the name's row (A4, P08.02)\"; }\n"
    "  #cr-disp .job .a{ padding-right:12px; }\n"
    "  #cr-disp .job:not(:has(.a)){ padding-bottom:16px; --cr-stack:\"phone: no address line, so the pip takes a foot row (A4, P08.02)\"; }\n"
    "  #cr-disp .job.hasmv{ padding-bottom:26px; --cr-stack:\"phone: the foot row for the grip (A4, P08.02)\"; }\n"
    "  #cr-disp .job.hasmv .t .pip{ right:29px; bottom:14px; }\n"
    "  /* bottom:10px, not less: the 1040 pad reaches 15px past the grip, and any further than the cell's\n"
    "     4px gap the NEXT chip (painted later) takes the bottom of it — measured 46x40 at bottom:5px */\n"
    "  #cr-disp .job .t .mv{ position:absolute; right:6px; bottom:10px; margin-left:0; --cr-stack:\"phone: the grip leaves the name's row (A4, P08.02)\"; }\n"
    "}\n")
# (d) the "N open" badge goes INSIDE the crew pill — the repairs lane now has the same
#     two-level shape as a crew lane (.crewc > div is the pill, .cn the name inside it)
s = one(s,
    "return '<div class=\"drow dlane\"><div class=\"crewc' + oc + '\"><div class=\"cn\">' + esc(name) + '</div>' + bdg + '</div>' + cells + '</div>';",
    "/* A4 (P08.02): the badge sat BESIDE the pill and ran into the first day column on a phone */\n"
    "        return '<div class=\"drow dlane\"><div class=\"crewc' + oc + '\"><div><div class=\"cn\">' + esc(name) + '</div>' + bdg + '</div></div>' + cells + '</div>';")
# (e) the week label: a short form, shown below 600px, so it is one line at every text size
s = one(s,
    "      lab.textContent = (weekOffset === 0 ? 'Next 7 \\u00b7 ' : '') +\n"
    "        mo[a.getMonth()] + ' ' + a.getDate() + ' \\u2013 ' + mo[b.getMonth()] + ' ' + b.getDate(); }",
    "      /* A4 (P08.02): the long form ran to 2 lines at Normal and 100px tall at Larger on a\n"
    "         phone; below 600px the short one shows (Nov 1\\u20137, or Oct 29\\u2013Nov 4). Fixed strings\n"
    "         and numbers only, so innerHTML is safe here. */\n"
    "      var _wl = (weekOffset === 0 ? 'Next 7 \\u00b7 ' : '') +\n"
    "        mo[a.getMonth()] + ' ' + a.getDate() + ' \\u2013 ' + mo[b.getMonth()] + ' ' + b.getDate();\n"
    "      var _ws = mo[a.getMonth()] + ' ' + a.getDate() + '\\u2013' + (a.getMonth() === b.getMonth() ? '' : mo[b.getMonth()] + ' ') + b.getDate();\n"
    "      lab.innerHTML = '<span class=\"wl\">' + _wl + '</span><span class=\"ws\">' + _ws + '</span>'; }")
s = one(s,
    "#cr-disp .dspwk button::after{",
    "#cr-disp .dspwklab .ws{ display:none; }   /* A4 (P08.02): the phone's short week label */\n"
    "@media (max-width:600px){\n"
    "  #cr-disp .dspwklab .wl{ display:none; }\n"
    "  #cr-disp .dspwklab .ws{ display:inline; white-space:nowrap; }\n"
    "  /* zoomed (Large, Larger, Sun) the bar no longer fits one row: Map takes the next one instead of\n"
    "     running off the screen (it reached x=403 of 390 at Larger). At Normal the title still wraps, as before. */\n"
    "  :root[data-cr-text] #cr-disp .dsptop,:root[data-cr-sun] #cr-disp .dsptop{ flex-wrap:wrap; }\n"
    "}\n"
    "#cr-disp .dspwk button::after{")

# ───────────────────────────── P08.03  the Production home ─────────────────────────────
s = one(s,
    "    head('Production', 'home') +             /* 1416: one heading, one colour */",
    "    head('Production', (typeof window.isProductionUser === 'function' && window.isProductionUser()) ? '' : 'home') +   /* 1416: one heading, one colour. A4 (P08.03): no \"<\" for a production account — close() reopens this same board for them (1420), so the button did nothing */")
s = one(s,
    "body.cr-field #brandTitle{ --cr-stack:\"1317 field user: no portal picker\"; pointer-events:none; }",
    "body.cr-field #brandTitle{ --cr-stack:\"1317 field user: no portal picker\"; pointer-events:none; }\n"
    "/* A4 (P08.03): with the Crews tile hidden above, Crew Dispatch sat alone in the left half of a 1fr 1fr row */\n"
    "body.cr-field #cr-pb .pbnav{ --cr-stack:\"1317 field user: Crew Dispatch is the only button in the row\"; grid-template-columns:1fr; }")

# ───────────────────────────── P08.12  the punch tabs ─────────────────────────────
s = one(s,
    ".pu-tab.on span{color:var(--rbe-panel2,#101015);}",
    ".pu-tab.on span{color:var(--rbe-panel2,#101015);}\n"
    "/* A4 (P08.12): Large, Larger and Sun are a real :root zoom, and five even cells then cut \"Callbacks\"\n"
    "   and \"Punch-outs\" (45 of 62px at Larger). There the strip wraps instead: even cells while\n"
    "   they fit, none narrower than its own label. Normal keeps the grid above, untouched. */\n"
    ":root[data-cr-text] .pu-tabs,:root[data-cr-sun] .pu-tabs{display:flex;flex-wrap:wrap;--cr-stack:\"A4: zoomed text sizes wrap the kind tabs rather than clip them\";}\n"
    ":root[data-cr-text] .pu-tab,:root[data-cr-sun] .pu-tab{flex:1 1 0;min-width:max-content;--cr-stack:\"A4: zoomed text sizes wrap the kind tabs rather than clip them\";}")

# ───────────────────────────── P07.02  the client name at Larger ─────────────────────────────
s = one(s,
    "  #cr-namebar .nb-l{ min-width:0; flex:1; }",
    "  /* A4 (P07.02): flex:1 let the three 40px contact buttons keep their row at Larger, where\n"
    "     the band is ~264 CSS px, and the name was left a 38px column — 9 lines of 2-3 letters.\n"
    "     A 150px floor means the buttons wrap to their own row (the band already wraps) once\n"
    "     the name would get less; at Normal and Large the row is unchanged. */\n"
    "  #cr-namebar .nb-l{ min-width:0; flex:1 1 150px; }")

# ───────────────────────────── P07.07  the estimate's x ─────────────────────────────
s = one(s,
    "      const el = e.target.closest('.cre-card');\n      if (!el) return;\n      /* 568:",
    "      if (e.target.closest('[data-cre-discard]')) return;   /* A4 (P07.07): the x asks to discard; it must not also open the estimate behind the sheet (its own listener is on the mount and runs after this one) */\n"
    "      const el = e.target.closest('.cre-card');\n      if (!el) return;\n      /* 568:")

# ───────────────────────────── P07.08  Ask at the end of Leads ─────────────────────────────
s = one(s,
    "#cr-ai-fab.tucked,#cr-ai-fab.tucked2{display:none;}\n",
    "#cr-ai-fab.tucked,#cr-ai-fab.tucked2{display:none;}\n"
    "/* A4 (P07.08): in a phone's browser the round Ask (52px, 84px up) sat on 45% of the last lead\n"
    "   card's button, and the list could not scroll it clear. While it shows, the list ends 68px\n"
    "   (its height + 16) further down. */\n"
    "@media (max-width:760px){ body:has(#cr-ai-fab.on:not(.tucked):not(.tucked2)) #ljList{padding-bottom:68px;} }\n")

# ───────────────────────────── P06.10 + P10.04  the Library ─────────────────────────────
s = one(s,
    "body.standalone #pwaNav #crPortalChip.all{border-color:rgba(220,220,220,.5);color:#dcdcdc}</style>",
    "body.standalone #pwaNav #crPortalChip.all{border-color:rgba(220,220,220,.5);color:#dcdcdc}\n"
    "/* A4 (P06.10, round-1 re-check on 1438): on a phone the Library's stack had holes - the theme\n"
    "   button sat at 187px over the hidden Library pill on the landing, and Manage's slot stayed\n"
    "   empty for everyone who is not an admin - and the end of every page sat under it. One\n"
    "   stack, filled from the bottom in 54px steps (TOC, Manage, Library, theme), and the page\n"
    "   ends clear of it and of Ask / File (146px up) by 16px. --rlk-m / --rlk-h say whether\n"
    "   Manage and the Library pill are showing; the classes are the ones that already show them. */\n"
    "@media (max-width:760px){\n"
    "body.viewing-rl{--rlk-m:0;--rlk-h:1}\n"
    "body.viewing-rl.cr-is-admin{--rlk-m:1}\n"
    "body.viewing-rl.rl-at-landing{--rlk-h:0}\n"
    "body.viewing-rl #cr-rlhome-btn{--cr-stack:\"A4: the phone stack has no holes\";bottom:calc(24px + 54px * (1 + var(--rlk-m,1)) + env(safe-area-inset-bottom,0px))}\n"
    "body.viewing-rl #cr-rltheme-btn{--cr-stack:\"A4: the phone stack has no holes\";bottom:calc(24px + 54px * (1 + var(--rlk-m,1) + var(--rlk-h,1)) + env(safe-area-inset-bottom,0px))}\n"
    "body.standalone.viewing-rl #cr-rlhome-btn{--cr-stack:\"A4: the phone stack has no holes, installed\";bottom:calc(79px + 54px * (1 + var(--rlk-m,1)) + env(safe-area-inset-bottom,0px)) !important}\n"
    "body.standalone.viewing-rl #cr-rltheme-btn{--cr-stack:\"A4: the phone stack has no holes, installed\";bottom:calc(79px + 54px * (1 + var(--rlk-m,1) + var(--rlk-h,1)) + env(safe-area-inset-bottom,0px)) !important}\n"
    "body.viewing-rl:not(.rl-at-book) #resourceLibraryView::after{content:\"\";display:block;height:calc(max(162px, 84px + 54px * (1 + var(--rlk-m,1) + var(--rlk-h,1))) + env(safe-area-inset-bottom,0px))}\n"
    "body.standalone.viewing-rl:not(.rl-at-book) #resourceLibraryView::after{height:calc(max(162px, 139px + 54px * (1 + var(--rlk-m,1) + var(--rlk-h,1))) + env(safe-area-inset-bottom,0px))}\n"
    "}</style>")
s = one(s,
    "  document.getElementById('resourceLibraryView').style.display = 'block';\n  window.scrollTo(0, 0);\n}",
    "  document.getElementById('resourceLibraryView').style.display = 'block';\n"
    "  /* A4 (P10.04): aiBusyScreen() already names the Library, but the global Ask only re-read it on its\n"
    "     3s timer or after a click — a back-button arrival showed it over the Library's own Ask / File */\n"
    "  try{ if(window.CardinalAssistant && typeof window.CardinalAssistant.paint === 'function') window.CardinalAssistant.paint(); }catch(_ai){}\n"
    "  window.scrollTo(0, 0);\n}")

# ───────────────────────────── P12.05  + New -> Punch-out ─────────────────────────────
s = one(s,
    "  var jobs = boardJobs().map(function(j){ return j.pr; });\n  var seen = {};\n  jobs.forEach(function(p){ seen[String(p.id)] = true; });\n",
    "  var jobs = boardJobs().map(function(j){ return j.pr; });\n  var seen = {};\n  jobs.forEach(function(p){ seen[String(p.id)] = true; });\n"
    "  /* A4 (P12.05): boardJobs() is the active stages plus jobs that already hold punch work, so\n"
    "     + New offered 2 of 7 jobs — and callbacks happen on Invoiced and Closed ones. Every other\n"
    "     job that is not Lost follows, by name; the renderer below already suffixes its stage. */\n"
    "  (window.cacheProjects || []).filter(function(p){ return p && !seen[String(p.id)] && normStage(p.stage) !== 'Lost'; })\n"
    "    .sort(function(x, y){ return String(x.name || '').localeCompare(String(y.name || '')); })\n"
    "    .forEach(function(p){ jobs.push(p); seen[String(p.id)] = true; });\n")

# ───────────────────────────── P12.06  New Lead: Lead Source ─────────────────────────────
s = one(s,
    '        <label class="ldmore">Lead Source <span class="ldreq">*</span>\n'
    '          <select id="ldSource"><option value="">&#8212; select &#8212;</option></select></label>\n',
    '        <!-- A4 (P12.06): out from behind More detail. It is required (1005), so every lead saved\n'
    '             without opening the fold bounced, and the reason printed 3,000px below the field. -->\n'
    '        <label>Lead Source <span class="ldreq">*</span>\n'
    '          <select id="ldSource"><option value="">&#8212; select &#8212;</option></select></label>\n'
    '        <div id="ldSourceErr" role="alert"></div>\n')
s = one(s,
    '&#65291; More detail\n        &#8212; company, job type, source, assignment, appointment, notes</button>',
    '&#65291; More detail\n        &#8212; company, job type, assignment, appointment, notes</button>')
s = one(s,
    "    _mb.innerHTML = '\\uFF0B More detail \\u2014 company, job type, source, assignment, appointment, notes';",
    "    _mb.innerHTML = '\\uFF0B More detail \\u2014 company, job type, assignment, appointment, notes';")
s = one(s,
    "      : '\\uFF0B More detail \\u2014 company, job type, source, assignment, appointment, notes';",
    "      : '\\uFF0B More detail \\u2014 company, job type, assignment, appointment, notes';")
s = one(s,
    "  var _ncw = document.getElementById('ldNoContactWrap');\n  if(_ncw) _ncw.style.display = 'none';\n",
    "  var _ncw = document.getElementById('ldNoContactWrap');\n  if(_ncw) _ncw.style.display = 'none';\n"
    "  var _lse = document.getElementById('ldSourceErr'); if(_lse) _lse.textContent = '';   /* A4 (P12.06) */\n"
    "  var _lsr = document.getElementById('ldSource'); if(_lsr && window.crValid) window.crValid.mark(_lsr, true);\n")
s = one(s,
    "  if(!document.getElementById('ldSource').value){\n"
    "    var _lm = document.getElementById('leadFormModal');\n"
    "    if(_lm && !_lm.classList.contains('ldshow')){\n"
    "      _lm.classList.add('ldshow');\n"
    "      var _lmb = document.getElementById('ldMoreBtn');\n"
    "      if(_lmb){ _lmb.setAttribute('aria-expanded', 'true'); _lmb.innerHTML = '\\u2212 Less detail'; }\n"
    "    }\n"
    "    err.textContent = 'Pick where this lead came from \\u2014 it is the one number that says whether knocking is working.';\n"
    "    try{ if(window.crValid && crValid.shake) crValid.shake(document.getElementById('ldSource')); else document.getElementById('ldSource').focus(); }catch(_s){ document.getElementById('ldSource').focus(); }\n"
    "    return;\n  }",
    "  if(!document.getElementById('ldSource').value){\n"
    "    /* A4 (P12.06): Lead Source is above the fold now, so there is nothing to reveal. The reason\n"
    "       goes beside the field too (Create Lead is ~3,000px further down on a phone), and the\n"
    "       field is marked, brought to the middle of the screen and focused (741's require). */\n"
    "    var _src = document.getElementById('ldSource');\n"
    "    var _srcMsg = 'Pick where this lead came from \\u2014 it is the one number that says whether knocking is working.';\n"
    "    err.textContent = _srcMsg;\n"
    "    var _sre = document.getElementById('ldSourceErr'); if(_sre) _sre.textContent = _srcMsg;\n"
    "    try{ _src.scrollIntoView({ block:'center' }); }catch(_v){}\n"
    "    try{ if(window.crValid && crValid.require) crValid.require(_src, _srcMsg); else _src.focus(); }catch(_s){ _src.focus(); }\n"
    "    return;\n  }")
s = one(s,
    "document.getElementById('ldSave').addEventListener('click', async function(){\n",
    "/* A4 (P12.06): a picked source takes its refusal note and outline away */\n"
    "(function(){\n"
    "  var ls = document.getElementById('ldSource');\n"
    "  if(ls) ls.addEventListener('change', function(){\n"
    "    var se = document.getElementById('ldSourceErr'); if(se) se.textContent = '';\n"
    "    if(ls instanceof HTMLSelectElement && ls.value && window.crValid) window.crValid.mark(ls, true);\n"
    "  });\n"
    "})();\n"
    "document.getElementById('ldSave').addEventListener('click', async function(){\n")
s = one(s,
    "#leadFormModal:not(.ldshow) .ldmore{display:none !important;}\n",
    "#leadFormModal:not(.ldshow) .ldmore{display:none !important;}\n"
    "/* A4 (P12.06): the Lead Source refusal, beside the field — #ldError's ink and size */\n"
    "#ldSourceErr{color:var(--sheet-red,var(--red));font:600 12.5px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;line-height:1.4;}\n"
    "#ldSourceErr:not(:empty){margin-top:5px;}\n")

# ───────────────────────────── P12.12  the inspection photo note ─────────────────────────────
s = one(s,
    "#insgSheet .ig-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;}",
    "#insgSheet .ig-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;}\n"
    "#insgSheet .ig-grid > .ig-who{grid-column:1/-1;}   /* A4 (P12.12): the empty / loading note was a grid child, squeezed into one 104px photo cell */")

# ───────────────────────────── P12.13  Skip checklist -> Start without AI ─────────────────────────────
s = one(s,
    "  var S = { types: {}, general: false, all: {} };",
    "  var S = { types: {}, general: false, all: {}, skipCl: false };   /* skipCl — A4 (P12.13): the person tapped Skip checklist */")
s = one(s,
    "  function igStep2(){\n    var a = S.all, h = '';",
    "  function igStep2(){\n    S.skipCl = false;   /* A4 (P12.13): back on the checklist, the skip is undone */\n    var a = S.all, h = '';")
s = one(s,
    "    if(a === 'skip') return igStep3();",
    "    if(a === 'skip'){ S.skipCl = true; return igStep3(); }   /* A4 (P12.13) */")
s = one(s,
    "    var opts = /** @type {any} */ ({ title: title });",
    "    var opts = /** @type {any} */ ({ title: title, skippedChecklist: !!S.skipCl });")
s = one(s,
    "      { title: title, fill: function(id){ return igFill(id, j, secs.list); } });",
    "      { title: title, skippedChecklist: !!S.skipCl, fill: function(id){ return igFill(id, j, secs.list); } });")
s = one(s,
    "  if(roofy && !cl){\n    /* F (judge 4)",
    "  /* A4 (P12.13): the guide passes skippedChecklist when the person already answered this by tapping\n"
    "     Skip checklist; the gallery's own New report (no opts) still asks */\n"
    "  if(roofy && !cl && !(opts && opts.skippedChecklist)){\n    /* F (judge 4)")

# ───────────────────────────── P12.15  appointments ─────────────────────────────
s = one(s,
    "  color:#2b2b2b;background:#fff;max-width:100%;}\n\n/* tasks */",
    "  color:#2b2b2b;background:#fff;max-width:100%;}\n"
    "#apptsView input.acxsel{min-height:44px;}   /* A4 (P12.15): the date, time and notes boxes were 33-37px; the select already has the app's 44 */\n\n/* tasks */")
s = one(s,
    '      <input type="text" id="apNotes" class="acxsel" placeholder="notes (optional)" style="flex:1;min-width:130px;">',
    '      <input type="text" id="apNotes" class="acxsel" placeholder="notes (optional)" style="flex:1 1 220px;min-width:130px;"><!-- A4 (P12.15): a 220px basis, so on a phone it takes its own row instead of cutting its hint -->')
s = one(s,
    "      '<small style=\"display:block;\">' + esc(a.appt_date || '') +\n      (a.appt_time ? ' \\u00b7 ' + esc(a.appt_time) : '') +",
    "      '<small style=\"display:block;\">' + esc(fmtDay(a.appt_date) || a.appt_date || '') +   /* A4 (P12.15): a day, not 2026-11-04 */\n"
    "      (a.appt_time ? ' \\u00b7 ' + esc(fmtApptTime(a.appt_time)) : '') +")
s = one(s,
    "          '<span class=\"btitle\">' + esc(a.title || k.nm) + (pr ? ' <span class=\"bcli\">\\u00b7 ' + esc(pr.name) + '</span>' : '') + '</span></div>';",
    "          /* A4 (P12.15): the profile's add form already writes \"Kind \\u2014 Client\" as the title */\n"
    "          '<span class=\"btitle\">' + esc(a.title || k.nm) + (pr && !(pr.name && String(a.title || '').indexOf(pr.name) !== -1) ? ' <span class=\"bcli\">\\u00b7 ' + esc(pr.name) + '</span>' : '') + '</span></div>';")

pl.write_atomic(P, s)
print('patch_1440_field applied to', P)
