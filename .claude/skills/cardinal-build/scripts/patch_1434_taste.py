#!/usr/bin/env python3
"""patch_1434_taste.py <in> <out> — build 1434: five of Theo's taste calls (picked 1 Nov 2026).

  T2  B   the phone drawer opens with Daily expanded, every other section folded, every time
  T5  B   a signed agreement says so in the editor's own notice bar (never saved, sent or printed)
  T6  B   Production's board in the app's one sans stack, tabular figures where the mono was
  T9  B   + New has ONE way to start a client: "New lead" (the Lead form), which gains Job cost
  T10 #1  on the desktop the page title is the one portal switcher: the banner pills, the rail
          segment and the rail's "Switch portal" row go (the phone keeps what it has)

Every edit is exact-match with an asserted count (patch_lib.sub). Byte-reproducible:
running it twice on the same input writes the same output. No stamp, no CHANGELOG.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

if len(sys.argv) != 3:
    sys.exit('usage: patch_1434_taste.py <in> <out>')
src = pl.load(sys.argv[1])
orig = src


def block(s, open_tag):
    """(start, end) of the block whose opening tag is open_tag, end = index of its close tag."""
    a = s.index(open_tag)
    assert s.count(open_tag) == 1, open_tag
    close = '</style>' if open_tag.startswith('<style') else '</script>'
    b = s.index(close, a)
    return a, b


def sub_in_block(s, open_tag, old, new, count=1):
    """Exact-match replace scoped to one block (assert AND splice inside the slice)."""
    a, b = block(s, open_tag)
    part = s[a:b]
    part = pl.sub(part, old, new, count)
    return s[:a] + part + s[b:]


# ════════════════════════════ T2 — Daily opens with the drawer ════════════════════════════
DR = '<script id="cr-drawer-script">'
src = sub_in_block(src, DR,
    "    /* ── 930 · collapsible sections · 1115 · closed on EVERY opening ──────\n",
    "    /* ── 930 · collapsible sections · 1115 · reset on EVERY opening ───────\n"
    "       T2 (Theo's pick B): the reset now opens DAILY and folds the rest. Still in\n"
    "       memory only, still never reading or writing the rail's key - see freshOpen().\n")
src = sub_in_block(src, DR,
    "    var secOpen = {};      /* slug -> 1, for this opening of the drawer only */\n",
    "    /* T2 (Theo's pick B): every opening starts with Daily expanded and every other\n"
    "       section folded. A fresh object each time, so whatever was opened or closed\n"
    "       on the last visit is forgotten - 1115's invariant, with Daily as its one\n"
    "       open section. Seeded at load too, so the first opening shows no flash. */\n"
    "    function freshOpen(){ return { daily: 1 }; }\n"
    "    var secOpen = freshOpen();   /* slug -> 1, for this opening of the drawer only */\n")
src = sub_in_block(src, DR,
    "      /* 1115: every opening starts collapsed. Fires on the CLOSED→OPEN edge\n",
    "      /* 1115 / T2: every opening starts from freshOpen() - Daily open, the\n"
    "         rest collapsed. Fires on the CLOSED→OPEN edge\n")
src = sub_in_block(src, DR,
    "      if(open && !wasOpen) secOpen = {};\n",
    "      if(open && !wasOpen) secOpen = freshOpen();\n")

# ════════════════════════════ T5 — the signed-agreement line ════════════════════════════
SIGNED_FN = (
"  toggleBtn.style.display = signedAt ? 'none' : '';   /* 1392: a signed document is past sent */\n"
"  /* T5: the page itself says so too, once the frame really holds this document (1328's\n"
"     loadedId) - at open this runs before the new page has loaded, and frame.onload paints it. */\n"
"  try{ if(current && frame.dataset.loadedId === String(current.id)) edSignedNote(/** @type {any} */ (frame).contentDocument, !!signedAt); }catch(_sn){}\n"
"}\n"
"\n"
"/* T5 (Theo's pick B; 1078-1079 unchanged): a signed agreement opened in the editor says so,\n"
"   in the editor's OWN notice bar - a clone of the sticky data-cardinal-hint strip, so it\n"
"   cannot drift from it. It keeps the data-cardinal-hint attribute (value \"signed\"), which is\n"
"   what 1270's strips key on: serializeFrame() removes every [data-cardinal-hint] from the copy\n"
"   that is saved and emailed, the frame's load resets them, and the print rule hides them.\n"
"   Static, not sticky: it is read on opening and then scrolls away, so a phone keeps the one-\n"
"   line editing bar over the document (judge 4). Shown only while the document is signed. */\n"
"function edSignedNote(doc, signed){\n"
"  try{\n"
"    if(!doc || !doc.body) return;\n"
"    var el = doc.querySelector('[data-cardinal-hint=\"signed\"]');\n"
"    if(!signed){ if(el) el.remove(); return; }\n"
"    var bar = doc.querySelector('[data-cardinal-hint=\"1\"]');\n"
"    if(el || !bar || !bar.parentNode) return;\n"
"    var sn = /** @type {HTMLElement} */ (bar.cloneNode(false));\n"
"    sn.setAttribute('data-cardinal-hint', 'signed');\n"
"    sn.style.position = 'static';\n"
"    sn.style.borderBottom = '1px solid #3a3a3a';\n"
"    sn.textContent = 'You\\u2019re editing a signed agreement. Saving keeps the signed one on file as a version.';\n"
"    bar.parentNode.insertBefore(sn, bar);\n"
"  }catch(_){}\n"
"}\n")
src = pl.sub(src,
    "  toggleBtn.style.display = signedAt ? 'none' : '';   /* 1392: a signed document is past sent */\n}\n",
    SIGNED_FN)
src = pl.sub(src,
    "      doc.body.insertBefore(hint, doc.body.firstChild);\n",
    "      doc.body.insertBefore(hint, doc.body.firstChild);\n"
    "      /* T5: a signed agreement says so, above this line (r is the row this frame loaded) */\n"
    "      edSignedNote(doc, !!(r.signed_at || (current && String(current.id) === String(r.id) && current.signed_at)));\n")

# ════════════════════════════ T6 — Production's board in the one sans ════════════════════════════
PB = '<style id="cr-pb-styles">'
SANS = "'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif"
a, b = block(src, PB)
n_mono_refs = src[a:b].count("var(--pb-mono,ui-monospace,Menlo,monospace);")
assert n_mono_refs == 23, n_mono_refs
src = sub_in_block(src, PB,
    "   Floors: 4.5:1 body, 3.0:1 large. Portal dots keep their CRM colours in both\n"
    "   themes — they are dots, not text.\n",
    "   Floors: 4.5:1 body, 3.0:1 large. Portal dots keep their CRM colours in both\n"
    "   themes — they are dots, not text.\n"
    "   TYPE (T6, Theo's pick B): the board's labels, counts, dates and tags were\n"
    "   monospace; they are the app's one sans stack now (--pb-sans, the 1415 order),\n"
    "   and every one of them keeps fixed-width digits (tabular-nums) so the columns\n"
    "   still line up. Size, weight, spacing, capitals and colour are untouched.\n")
src = sub_in_block(src, PB,
    "  --pb-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;\n",
    "  --pb-sans:" + SANS + ";\n")
src = sub_in_block(src, PB,
    "var(--pb-mono,ui-monospace,Menlo,monospace);",
    "var(--pb-sans," + SANS + "); font-variant-numeric:tabular-nums;", count=23)
# the board's own Add form (the composer + New → Punch-out also opens): its labels and two buttons
src = sub_in_block(src, PB,
    "#cr-pb-modal label{\n  display:block; font:600 11px ui-monospace,Menlo,monospace; letter-spacing:.14em;\n",
    "#cr-pb-modal label{\n  display:block; font:600 11px " + SANS + "; font-variant-numeric:tabular-nums; letter-spacing:.14em;\n")
src = sub_in_block(src, PB,
    "  flex:1; padding:13px; border-radius:11px; font:700 13px ui-monospace,Menlo,monospace;\n",
    "  flex:1; padding:13px; border-radius:11px; font:700 13px " + SANS + "; font-variant-numeric:tabular-nums;\n")
# the four boxes' labels: in the sans an upper-case word is wider than in the mono at the same
# tracking ("SCHEDULED" 91px -> 99px), and in the 1366 laptop's 4-up row (90px) that clipped it
# (gate_1416 D). Tighter tracking is the one property this changes, measured back to the mono's width.
src = sub_in_block(src, PB,
    "#cr-pb .pbtile .l{\n  display:flex; align-items:center; gap:6px; margin-top:6px;\n"
    "  font:600 11px var(--pb-sans," + SANS + "); font-variant-numeric:tabular-nums; letter-spacing:.14em; color:var(--pb-mut,#9aa3ab);\n",
    "#cr-pb .pbtile .l{\n  display:flex; align-items:center; gap:6px; margin-top:6px;\n"
    "  /* T6: .14em was the mono's tracking; in the sans \"SCHEDULED\" ran 8px wider and clipped in the\n"
    "     1366 laptop's 4-up row, so the sans is tracked back to the mono's width */\n"
    "  font:600 11px var(--pb-sans," + SANS + "); font-variant-numeric:tabular-nums; letter-spacing:.06em; color:var(--pb-mut,#9aa3ab);\n")
a, b = block(src, PB)
assert 'monospace' not in src[a:b].replace('were\n   monospace', ''), 'a monospace stack survived in cr-pb-styles'
assert '--pb-mono' not in src, '--pb-mono is referenced somewhere else'

# ════════════════════════════ T9 — + New: one way to start a client ════════════════════════════
src = pl.sub(src,
    '          <button class="navopt" data-new="contact" data-cri="person lg">Contact</button>\n'
    '          <button class="navopt" data-new="lead" data-cri="flag lg">Lead</button>\n',
    '          <!-- T9 (Theo\'s pick B): ONE way to start a client. The separate "Contact" entry\n'
    '               (#projModal, "Add project") is gone from here; #projModal still EDITS a\n'
    '               client and still makes 1372\'s "New job for" an existing one. -->\n'
    '          <button class="navopt" data-new="lead" data-cri="flag lg">New lead</button>\n')
src = pl.sub(src,
    "  if(kind === 'contact'){ openProjModal(null); }\n  else if(kind === 'lead'){\n    if(isProductionUser()){\n"
    "      crTell('Lead creation is for sales and admins \\u2014 production accounts can add Contacts, Tasks, and Reminders.');\n",
    "  /* T9: 'contact' (#projModal) is no longer a + New entry - New lead is the one way in */\n"
    "  if(kind === 'lead'){\n    if(isProductionUser()){\n"
    "      crTell('Lead creation is for sales and admins \\u2014 production accounts can add Tasks, Reminders and Punch-outs.');\n")
src = pl.sub(src,
    "      crTell('Lead creation is for sales and admins \\u2014 production accounts can add Contacts, Tasks, and Reminders.');\n",
    "      crTell('Lead creation is for sales and admins \\u2014 production accounts can add Tasks, Reminders and Punch-outs.');\n")
# the one field the Lead form lacked
src = pl.sub(src,
    "              <option>Retail</option><option>Service</option><option>Tarp Only</option><option>Warranty</option></select></label>\n"
    "        </div>\n"
    "        <!-- 1253: trades at intake",
    "              <option>Retail</option><option>Service</option><option>Tarp Only</option><option>Warranty</option></select></label>\n"
    "        </div>\n"
    "        <!-- T9: the one field the Add-project form had and this one lacked. Same words, same\n"
    "             input, same key (checklist.job_cost) - and, like 1203 there, admins only. -->\n"
    "        <label class=\"ldmore\" id=\"ldJobCostWrap\">Job cost (materials + labor, $)<input type=\"number\" id=\"ldJobCost\" min=\"0\" step=\"0.01\" placeholder=\"for profit reports\"></label>\n"
    "        <!-- 1253: trades at intake")
src = pl.sub(src,
    "  ['ldCategory','ldWorkType','ldSource','ldPartner','ldInsCoverage'].forEach(function(id){\n"
    "    var el = document.getElementById(id); if(el) el.value = '';\n  });\n",
    "  ['ldCategory','ldWorkType','ldSource','ldPartner','ldInsCoverage','ldJobCost'].forEach(function(id){\n"
    "    var el = document.getElementById(id); if(el) el.value = '';\n  });\n"
    "  /* T9: job cost is a profit-report field - admins only, as on the Add-project form (1203) */\n"
    "  var _ldJc = document.getElementById('ldJobCostWrap');\n"
    "  if(_ldJc) _ldJc.style.display = isAdminUser() ? '' : 'none';\n")
src = pl.sub(src,
    "        trades: (function(){ var t = []; document.querySelectorAll('#ldTrades input:checked').forEach(function(cb){ t.push((/** @type {HTMLInputElement} */ (cb)).value); }); return t.length ? t : null; })() })\n",
    "        trades: (function(){ var t = []; document.querySelectorAll('#ldTrades input:checked').forEach(function(cb){ t.push((/** @type {HTMLInputElement} */ (cb)).value); }); return t.length ? t : null; })(),\n"
    "        /* T9: the key the Add-project form writes and Reports reads (rptCk(p).job_cost) */\n"
    "        job_cost: (function(){ var j = /** @type {HTMLInputElement|null} */ (document.getElementById('ldJobCost')); var v = j ? j.value : ''; return v === '' ? null : Number(v); })() })\n")

# ════════════════════════════ T10 — one portal switcher on the desktop ════════════════════════════
# 1. the banner's pill strip (shown only above 900px, so never on a phone): markup, styles, script
src = pl.sub(src,
    '  <span class="cbcrm" id="cbCrm" aria-label="Switch CRM">\n'
    '    <b data-crm-go="retail" class="on"><i style="background:#c8202e"></i>Retail</b>\n'
    '    <b data-crm-go="insurance"><i style="background:#2dd4bf"></i>Insurance</b>\n'
    '    <b data-crm-go="community"><i style="background:#34d399"></i>Community</b>\n'
    '  </span>\n',
    '  <!-- T10 (Theo: keep #1): the Retail / Insurance / Community pill strip is gone. On the\n'
    '       desktop the page title is the one portal switcher; it was never shown on a phone. -->\n')
BS = '<style id="cr-banner-styles">'
assert src.count(BS) == 1, BS
src = sub_in_block(src, BS,
    "#crBanner .cbcrm{margin-left:auto;display:flex;align-items:center;gap:4px;background:var(--bink);\n"
    "  border:1px solid var(--bline);border-radius:8px;padding:3px;margin-top:5px;margin-bottom:5px;}\n"
    "#crBanner .cbcrm b{display:flex;align-items:center;gap:6px;font:700 11px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;\n"
    "  color:#aab1ba;padding:5px 11px;border-radius:6px;cursor:pointer;user-select:none;position:relative;z-index:1;}\n"
    "/* 944: the chips are 22px tall inside fixed header chrome that must not grow\n"
    "   22px on every screen - so the tap target is a 44px ::after pad, the .pu-box\n"
    "   shape. A rect audit cannot see this; gate_touch944 reads the pseudo box. */\n"
    "#crBanner .cbcrm b::after{content:\"\";position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);height:44px;}\n"
    "#crBanner .cbcrm b:hover{color:var(--bacclt);}\n"
    "#crBanner .cbcrm b.on{background:rgba(255,255,255,.07);color:var(--bacclt);}\n",
    "/* T10: the .cbcrm portal pills (369/938/944) are deleted with their markup. */\n")
a, b = block(src, BS)
i0 = src.index("/* 938: the selected CRM chip was 3.51:1", a)
i1 = src.index("#crBanner .cbcrm i{width:8px;height:8px;border-radius:50%;display:inline-block;}\n", i0)
assert a < i0 < i1 < b
old938 = src[i0:i1 + len("#crBanner .cbcrm i{width:8px;height:8px;border-radius:50%;display:inline-block;}\n")]
assert old938.count('\n') == 13 and old938.endswith("display:inline-block;}\n"), repr(old938[-80:])
src = sub_in_block(src, BS, old938, "")
src = sub_in_block(src, BS,
    "@media (max-width:900px){\n  #crBanner .cbcrm{display:none;}\n",
    "@media (max-width:900px){\n")
src = pl.sub(src,
    "/* tuned for a dark dropdown/panel - invisible on the light one .cbmenu and\n"
    "   .cbcrm now paint via --bink above */\n",
    "/* tuned for a dark dropdown/panel - invisible on the light one .cbmenu\n"
    "   now paints via --bink above */\n")
src = pl.sub(src,
    ":root[data-theme=\"rb-light\"] body:not([data-crm-head=\"insurance\"]):not([data-crm-head=\"community\"]) #crBanner .cbcrm b{\n"
    "  color:#5a6470;\n}\n"
    ":root[data-theme=\"rb-light\"] body:not([data-crm-head=\"insurance\"]):not([data-crm-head=\"community\"]) #crBanner .cbcrm b.on{\n"
    "  background:rgba(0,0,0,.07);\n}\n",
    "")
src = pl.sub(src,
    "   NOT here on purpose: .cbcrm b (fixed header chrome — 44px ::after pad at\n"
    "   source, the .pu-box shape, so the banner does not grow on every screen);\n"
    "   #projectView",
    "   NOT here on purpose:\n"
    "   #projectView")
src = pl.sub(src,
    "body.cr-field #crBanner, body.cr-field #cbCrm, body.cr-field #cbSearch,",
    "body.cr-field #crBanner, body.cr-field #cbSearch,")
BJ = '<script id="cr-banner-script">'
src = sub_in_block(src, BJ,
    "var CRM_GO = {\n"
    "  retail: function(){ if(typeof window.showHome === 'function') window.showHome(); },\n"
    "  insurance: function(){ if(typeof window.showCardinalTruth === 'function') window.showCardinalTruth(); },\n"
    "  community: function(){ if(window.CardinalCommunityHub && typeof window.CardinalCommunityHub.show === 'function') window.CardinalCommunityHub.show(); }\n"
    "};\n",
    "")
src = sub_in_block(src, BJ,
    "function cbCrmSync(){\n"
    "  var k = document.body.dataset.crmHead || document.body.dataset.crm || 'retail';\n"
    "  Array.prototype.forEach.call(B.querySelectorAll('[data-crm-go]'), function(x){\n"
    "    x.classList.toggle('on', x.getAttribute('data-crm-go') === k);\n"
    "  });\n"
    "  paintCrmPills(k);\n"
    "}\n",
    "/* T10: the CRM pill strip this used to highlight is gone (the page title switches portal);\n"
    "   what is left to follow the CRM is 755's Contacts/Leads pair. */\n"
    "function cbCrmSync(){\n"
    "  var k = document.body.dataset.crmHead || document.body.dataset.crm || 'retail';\n"
    "  paintCrmPills(k);\n"
    "}\n")
a, b = block(src, BJ)
j0 = src.index("B.addEventListener('click', function(e){\n  var c = e.target && e.target.closest ? e.target.closest('[data-crm-go]') : null;\n", a)
j1 = src.index("  if(CRM_GO[k]) CRM_GO[k]();\n});\n", j0) + len("  if(CRM_GO[k]) CRM_GO[k]();\n});\n")
assert a < j0 < j1 < b and src[j0:j1].count('\n') == 16, src[j0:j1].count('\n')
src = sub_in_block(src, BJ, src[j0:j1], "")

# 2. the rail's Retail | Insurance | Community segment (it mirrored #cbCrm) and its styles
LS = '<style id="cr-lnav-styles">'
src = sub_in_block(src, LS,
    "body.cr-lnav-mini #cr-lnav .lnav-tx,\nbody.cr-lnav-mini #cr-lnav .lnav-crm,\nbody.cr-lnav-mini #cr-lnav .lnav-sec,\n",
    "body.cr-lnav-mini #cr-lnav .lnav-tx,\nbody.cr-lnav-mini #cr-lnav .lnav-sec,\n")
src = sub_in_block(src, LS,
    "#cr-lnav .lnav-crm{display:flex;margin:12px 10px 4px;border-radius:9px;overflow:hidden;\n"
    "  border:1px solid var(--rbe-panelbd,#24242c);background:var(--rbe-panel,#16161B)}\n"
    "#cr-lnav .lnav-crm button{flex:1;min-width:0;background:none;border:0;\n"
    "  border-right:1px solid var(--rbe-panelbd,#24242c);padding:8px 2px;cursor:pointer;\n"
    "  font-weight:700;font-size:11px;letter-spacing:-.01em;color:var(--rbe-mute,#9aa0a8);\n"
    "  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n"
    "#cr-lnav .lnav-crm button:last-child{border-right:0}\n"
    "#cr-lnav .lnav-crm button.on{color:var(--lnav-seg-on,var(--lnav-on,#fff));background:var(--lnav-seg,var(--lnav-crmc,#c8202e))}\n"
    ":root[data-theme=\"rb-light\"] #cr-lnav .lnav-crm button.on{color:var(--lnav-seg-on-lt,var(--lnav-on,#fff));background:var(--lnav-seg-lt,var(--lnav-crmc,#c8202e))}\n",
    "/* T10: the rail's Retail | Insurance | Community segment is gone - on the desktop the\n"
    "   page title is the one portal switcher (Theo kept #1 of four). */\n")
src = sub_in_block(src, LS,
    "#cr-lnav .lnav-item:focus-visible,#cr-lnav .lnav-sec:focus-visible,\n"
    "#cr-lnav .lnav-crm button:focus-visible{outline:2px solid var(--lnav-crmc,#c8202e);outline-offset:-2px}\n",
    "#cr-lnav .lnav-item:focus-visible,#cr-lnav .lnav-sec:focus-visible{outline:2px solid var(--lnav-crmc,#c8202e);outline-offset:-2px}\n")
src = pl.sub(src,
    "/* the CRM switcher sits in the well too, so it needs the same ground */\n"
    ":root:not([data-theme=\"rb-light\"]) #cr-lnav .lnav-crm{\n"
    "  background:#0D1220;border-color:#223047;\n"
    "}\n"
    ":root:not([data-theme=\"rb-light\"]) #cr-lnav .lnav-crm button{border-right-color:#223047}\n",
    "")
src = pl.sub(src,
    "   237×35 (.lnav-out) / ~43×28 (.lnav-crm button) at 1194×834 — the desktop\n",
    "   237×35 (.lnav-out) at 1194×834 — the desktop\n")
src = pl.sub(src,
    "#cr-lnav .lnav-item,#cr-lnav .lnav-sec,#cr-lnav .lnav-mini,#cr-lnav .lnav-out,#cr-lnav .lnav-crm button{min-height:44px;}\n",
    "#cr-lnav .lnav-item,#cr-lnav .lnav-sec,#cr-lnav .lnav-mini,#cr-lnav .lnav-out{min-height:44px;}\n")

LJ = '<script id="cr-lnav-script">'
src = sub_in_block(src, LJ,
    "if(el.id === 'signOutBtn') return;\nif(el.hasAttribute && el.hasAttribute('data-cr-footer')) return;\n",
    "if(el.id === 'signOutBtn') return;\nif(el.hasAttribute && el.hasAttribute('data-cr-footer')) return;\n"
    "/* T10 (Theo: keep #1): on the desktop the page title is the one portal switcher, so the\n"
    "   rail does not mirror the drawer's \"Switch portal\" row. The row stays in the phone\n"
    "   drawer, and the section's count follows (it is the number of rows mirrored). */\n"
    "if(el.getAttribute && el.getAttribute('data-nav') === 'landing') return;\n")
src = sub_in_block(src, LJ,
    "/* The CRM switcher is the banner's, mirrored - not a second one. Clicking a\n"
    "   mirrored control clicks the real one, so crmNow()/skin() stay the only\n"
    "   things that decide what the active CRM is. */\n"
    "function crms(){\n"
    "var bar = document.getElementById('cbCrm');\n"
    "if(!bar) return [];\n"
    "return Array.prototype.slice.call(bar.querySelectorAll('[data-crm-go]')).map(function(b){\n"
    "return { key:b.getAttribute('data-crm-go'), label:(b.textContent || '').trim(), el:b };\n"
    "});\n"
    "}\n",
    "/* T10: the rail no longer mirrors a CRM switcher - the banner's is deleted and the page\n"
    "   title is the one portal switcher on the desktop. crmNow()/skin() still decide the CRM;\n"
    "   activeCrm() below only reads it for the rail's colours. */\n")
src = sub_in_block(src, LJ,
    "function signature(secs, cs){\nreturn [activeCrm(), cs.map(function(c){ return c.key; }).join(','),\n",
    "function signature(secs){\nreturn [activeCrm(),\n")
src = sub_in_block(src, LJ,
    "var secs = scrape(), cs = crms();\nif(!secs.length) return;\nvar sig = signature(secs, cs);\n",
    "var secs = scrape();\nif(!secs.length) return;\nvar sig = signature(secs);\n")
src = sub_in_block(src, LJ,
    "/* 1393: white on community's mint was 1.92:1, on production's orange 2.03 — each accent names its ink */\n"
    "h.style.setProperty('--lnav-on', ({ community:'#062b1f', production:'#1a1205', sales:'#1a1205' })[crm] || '#fff');\n"
    "/* J16: the Retail | Insurance | Community SEGMENT wears the active CRM's identity\n"
    "   hue (dark: fill, ink; light: fill, ink). Portals with no identity hue keep\n"
    "   exactly what they had (--lnav-crmc / --lnav-on). White on #c8202e 5.67, ink on\n"
    "   #2dd4bf 9.18, on #34d399 7.96; light white on #0f766e 5.47, on #047857 5.48. */\n"
    "var SEG16 = ({ retail:['#c8202e','#ffffff','#c8202e','#ffffff'],\n"
    "               insurance:['#2dd4bf','#04201c','#0f766e','#ffffff'],\n"
    "               community:['#34D399','#062b1f','#047857','#ffffff'] })[crm] || null;\n"
    "h.style.setProperty('--lnav-seg', SEG16 ? SEG16[0] : (CRM_COLOR[crm] || CRM_COLOR.retail));\n"
    "h.style.setProperty('--lnav-seg-on', SEG16 ? SEG16[1] : (({ production:'#1a1205', sales:'#1a1205' })[crm] || '#fff'));\n"
    "h.style.setProperty('--lnav-seg-lt', SEG16 ? SEG16[2] : (CRM_COLOR[crm] || CRM_COLOR.retail));\n"
    "h.style.setProperty('--lnav-seg-on-lt', SEG16 ? SEG16[3] : (({ production:'#1a1205', sales:'#1a1205' })[crm] || '#fff'));\n",
    "/* T10: 1393's and J16's segment inks are gone with the CRM segment they painted */\n")
src = sub_in_block(src, LJ,
    "'<span class=\"lnav-mini-ic\">\\u00AB</span><span class=\"lnav-tx\">Collapse</span></button>' +\n"
    "(cs.length\n"
    "? '<div class=\"lnav-crm\" role=\"group\" aria-label=\"Switch CRM\">' + cs.map(function(c){\n"
    "return '<button type=\"button\" data-crm=\"' + esc(c.key) + '\" class=\"' +\n"
    "(c.key === crm ? 'on' : '') + '\"' +\n"
    "(c.key === crm ? ' aria-current=\"true\"' : '') + '>' + esc(c.label) + '</button>';\n"
    "}).join('') + '</div>'\n"
    ": '') +\n",
    "'<span class=\"lnav-mini-ic\">\\u00AB</span><span class=\"lnav-tx\">Collapse</span></button>' +\n")
src = sub_in_block(src, LJ,
    "wire(h, secs, cs);\n}\n\nfunction wire(h, secs, cs){\n",
    "wire(h, secs);\n}\n\nfunction wire(h, secs){\n")
src = sub_in_block(src, LJ,
    "h.querySelectorAll('[data-crm]').forEach(function(b){\n"
    "b.onclick = function(){\n"
    "var k = b.getAttribute('data-crm');\n"
    "for(var i = 0; i < cs.length; i++){\n"
    "if(cs[i].key === k && cs[i].el){ try{ cs[i].el.click(); }catch(_){} return; }\n"
    "}\n"
    "};\n"
    "});\n"
    "}\n",
    "}\n")
a, b = block(src, LJ)
assert 'crms(' not in src[a:b] and 'SEG16' not in src and '--lnav-seg' not in src and "'--lnav-on'" not in src
import re
assert not re.search(r'\bcs\b', src[a:b]), 'a cs reference survived in cr-lnav-script'

assert 'data-crm-go' not in src and 'CRM_GO' not in src and 'cbCrm"' not in src and "'cbCrm'" not in src
assert 'lnav-crm ' not in src and 'lnav-crm{' not in src and 'lnav-crm,' not in src and 'lnav-crm"' not in src
pl.write_atomic(sys.argv[2], src)
for m in ["function freshOpen(){ return { daily: 1 }; }", "function edSignedNote(doc, signed){",
          "--pb-sans:'Segoe UI'", 'data-new="lead" data-cri="flag lg">New lead</button>', 'id="ldJobCost"',
          "if(el.getAttribute && el.getAttribute('data-nav') === 'landing') return;"]:
    pl.assert_in(sys.argv[2], m)
    assert m not in orig, ('negative control: marker already in the input', m)   # orig, so in-place runs work
print('patch_1434_taste: wrote', sys.argv[2], len(orig), '->', len(src), 'chars')
