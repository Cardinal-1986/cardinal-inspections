#!/usr/bin/env python3
"""Build 1207 — the header search answers while you type (audit option 6b, B6).

Walk 4, from a clean boot on a phone: tap the lens, type "Diamond", and **nothing
happens**. Press Return and the Clients directory opens filtered to 1 of 3. That
works, but nothing on screen ever said Return was required, and from Leads the
Return navigates you AWAY to Clients. Build 1203 shipped the cheap half —
`enterkeyhint="search"` and a placeholder that says "… then Return". This is the
real half.

  * an `input` listener renders the top five matches under the row: name, PO,
    stage, address. Tap opens that client. Return still opens the full directory,
    unchanged.
  * ⚠ ONE MATCHER, NOT TWO. `cdMatch()` built its haystack inline; that array is
    now `crClientHay(pr)` and BOTH callers use it. A second copy would have been
    a search that finds different clients than the directory it hands you off to
    — the duplicate-pipeline bug this project pays for most often.
  * the panel is theme-aware through `--rbe-panel / --rbe-ink / --rbe-line /
    --rbe-mute`, each with a literal fallback (448-449), because it is appended to
    <body> and the header's own --h* tokens are declared on `.site` and would not
    reach it.
  * every row is 44px+ — the floor build 1206 just put a ratchet on.

Usage: patch_1207.py --src in.html --dst out.html
"""
import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

# ------------------------------------------------------------------ 1. CSS
CSS_OLD = "#headSearch:focus{outline:2px solid var(--red);background:rgba(255,255,255,.16);}\n"
CSS_NEW = (
"#headSearch:focus{outline:2px solid var(--red);background:rgba(255,255,255,.16);}\n"
"/* 1207 — the live results panel. Fixed to the viewport and appended to <body>,\n"
"   because #headSearch MOVES: on desktop it is a flex child of #cr-hd2-bar and on\n"
"   a phone ensureSearchRow() re-parents it into #cr-hd2-srch. A panel that is a\n"
"   sibling would have to be moved with it; one positioned from the input's own\n"
"   rect does not care where the input currently lives.\n"
"   ⚠ Tokens are --rbe-*, not the header's --h*: those are declared on `.site`, and\n"
"   this element is not inside it. Literal fallbacks per 448-449. */\n"
"#cr-hsres{position:fixed;z-index:9400;display:none;box-sizing:border-box;\n"
"  background:var(--rbe-panel,#16161B);border:1px solid var(--rbe-line,#232329);\n"
"  border-radius:12px;box-shadow:0 18px 44px rgba(0,0,0,.45);overflow:hidden;\n"
"  max-height:min(58vh,420px);overflow-y:auto;-webkit-overflow-scrolling:touch;}\n"
"#cr-hsres.open{display:block;}\n"
"#cr-hsres .hsrow{display:block;width:100%;box-sizing:border-box;text-align:left;\n"
"  border:0;border-bottom:1px solid var(--rbe-line,#232329);background:transparent;\n"
"  cursor:pointer;padding:9px 14px;min-height:44px;font-family:'Segoe UI',Arial,sans-serif;}\n"
"#cr-hsres .hsrow:last-child{border-bottom:0;}\n"
"#cr-hsres .hsrow:hover,#cr-hsres .hsrow:focus{background:var(--rbe-card,rgba(255,255,255,.06));outline:none;}\n"
"#cr-hsres .hsnm{display:block;font:700 14px 'Segoe UI',Arial,sans-serif;color:var(--rbe-ink,#cfd6df);}\n"
"#cr-hsres .hsmeta{display:block;margin-top:2px;font:600 12px 'Segoe UI',Arial,sans-serif;\n"
"  color:var(--rbe-mute,#b8bec6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}\n"
"#cr-hsres .hsfoot{display:block;width:100%;box-sizing:border-box;text-align:left;border:0;\n"
"  border-top:1px solid var(--rbe-line,#232329);background:transparent;cursor:pointer;\n"
"  padding:0 14px;min-height:44px;color:var(--rbe-mute,#b8bec6);\n"
"  font:700 12px 'Segoe UI',Arial,sans-serif;}\n"
"#cr-hsres .hsnone{padding:14px;color:var(--rbe-mute,#b8bec6);font:600 13px 'Segoe UI',Arial,sans-serif;}\n"
)

# ------------------------------------------------------- 2. ONE matcher
HAY_OLD = (
"  var q = (document.getElementById('cliFilter').value || '').trim().toLowerCase();\n"
"  if(q){\n"
"    var hay = [pr.name, pr.address, pr.phone, phoneHay(pr), pr.email, pr.created_by,\n"
"      poOf(pr) ? '#' + poOf(pr) + ' ' + poOf(pr) : ''].join(' ').toLowerCase();\n"
"    if(hay.indexOf(q) === -1) return false;\n"
"  }\n"
"  return true;\n"
"}\n"
)
HAY_NEW = (
"  var q = (document.getElementById('cliFilter').value || '').trim().toLowerCase();\n"
"  if(q && crClientHay(pr).indexOf(q) === -1) return false;\n"
"  return true;\n"
"}\n"
"/* 1207: the haystack, extracted so the header's live search and this directory\n"
"   cannot drift apart. It was inline here and nowhere else; a second copy in the\n"
"   header would mean a search that finds different clients than the directory it\n"
"   hands you off to, which is the duplicate-pipeline bug this project pays for\n"
"   most often. One definition, two callers.\n"
"   ⚠ A THIRD, SLIGHTLY DIFFERENT haystack lives in renderHome() and is left\n"
"   alone on purpose: it omits pr.created_by, so folding it in here would start\n"
"   matching the Home board on a rep's email address — a behaviour change nobody\n"
"   asked for. Known, not missed. */\n"
"function crClientHay(pr){\n"
"  return [pr.name, pr.address, pr.phone, phoneHay(pr), pr.email, pr.created_by,\n"
"    poOf(pr) ? '#' + poOf(pr) + ' ' + poOf(pr) : ''].join(' ').toLowerCase();\n"
"}\n"
)

# ------------------------------------- 2b. Insurance Clients uses it too
# Its haystack is crClientHay's SUPERSET — the same seven fields plus five
# insurance ones — so routing it through the shared function is provably
# behaviour-neutral and removes the drift risk outright.
INS_OLD = (
"    var hay = [\n"
"      pr.name, pr.address, pr.phone, phoneHay(pr), pr.email, pr.created_by,\n"
"      poOf(pr) ? '#' + poOf(pr) + ' ' + poOf(pr) : '',\n"
"      I.carrier, I.claim_number, I.policy_number, adj.name, adj.phone\n"
"    ].join(' ').toLowerCase();\n"
)
INS_NEW = (
"    /* 1207: the base seven fields come from crClientHay(), the same matcher the\n"
"       Clients directory and the header search use; only the five insurance ones\n"
"       are local. Byte-for-byte the same haystack as before, from one source. */\n"
"    var hay = crClientHay(pr) + ' ' +\n"
"      [I.carrier, I.claim_number, I.policy_number, adj.name, adj.phone]\n"
"        .join(' ').toLowerCase();\n"
)

# --------------------------------------------------------------- 3. the JS
JS_OLD = (
"/* ---------- header search (desktop) ---------- */\n"
"document.getElementById('headSearch').addEventListener('keydown', function(e){\n"
"  if(e.key !== 'Enter') return;\n"
"  var v = this.value.trim();\n"
"  openClientsDirectory();\n"
"  var cf = document.getElementById('cliFilter');\n"
"  cf.value = v;\n"
"  renderClientDirectory();\n"
"});\n"
)
JS_NEW = (
"/* ---------- header search (desktop) ---------- */\n"
"document.getElementById('headSearch').addEventListener('keydown', function(e){\n"
"  if(e.key === 'Escape'){ crHsClose(); return; }\n"
"  if(e.key !== 'Enter') return;\n"
"  crHsClose();\n"
"  var v = this.value.trim();\n"
"  openClientsDirectory();\n"
"  var cf = document.getElementById('cliFilter');\n"
"  cf.value = v;\n"
"  renderClientDirectory();\n"
"});\n"
"\n"
"/* 1207 (audit 6b / B6): the search answers while you type. Return still opens\n"
"   the whole directory and that path is untouched — this is a shortcut past it,\n"
"   not a replacement for it.\n"
"   ⚠ It matches with crClientHay(), the SAME haystack cdMatch() uses, so the\n"
"   five rows here are always a prefix of what Return would show. */\n"
"var CR_HS_MAX = 5;\n"
"function crHsPanel(){\n"
"  var p = document.getElementById('cr-hsres');\n"
"  if(!p){\n"
"    p = document.createElement('div');\n"
"    p.id = 'cr-hsres';\n"
"    p.setAttribute('role', 'listbox');\n"
"    p.setAttribute('aria-label', 'Client search results');\n"
"    document.body.appendChild(p);\n"
"  }\n"
"  return p;\n"
"}\n"
"function crHsClose(){\n"
"  var p = document.getElementById('cr-hsres');\n"
"  if(p) p.classList.remove('open');\n"
"}\n"
"function crHsMatches(q){\n"
"  q = String(q || '').trim().toLowerCase();\n"
"  if(q.length < 2) return { hits: [], total: 0 };\n"
"  var all = (typeof cacheProjects !== 'undefined' && cacheProjects) ? cacheProjects : [];\n"
"  var hit = all.filter(function(pr){ return crClientHay(pr).indexOf(q) !== -1; });\n"
"  /* a name that STARTS with what you typed is what you meant; everything else\n"
"     matched on an address, a phone or a PO and sorts after it. */\n"
"  hit.sort(function(a, b){\n"
"    var an = String(a.name || '').toLowerCase(), bn = String(b.name || '').toLowerCase();\n"
"    var ap = an.indexOf(q) === 0 ? 0 : (an.indexOf(q) !== -1 ? 1 : 2);\n"
"    var bp = bn.indexOf(q) === 0 ? 0 : (bn.indexOf(q) !== -1 ? 1 : 2);\n"
"    return ap - bp || an.localeCompare(bn);\n"
"  });\n"
"  return { hits: hit.slice(0, CR_HS_MAX), total: hit.length };\n"
"}\n"
"function crHsPlace(){\n"
"  var i = document.getElementById('headSearch'), p = document.getElementById('cr-hsres');\n"
"  if(!i || !p) return false;\n"
"  var r = i.getBoundingClientRect();\n"
"  if(r.width < 2 || r.height < 2) return false;\n"
"  var w = Math.max(240, Math.min(r.width, innerWidth - 16));\n"
"  var left = Math.max(8, Math.min(r.left, innerWidth - w - 8));\n"
"  p.style.left = Math.round(left) + 'px';\n"
"  p.style.top = Math.round(r.bottom + 6) + 'px';\n"
"  p.style.width = Math.round(w) + 'px';\n"
"  return true;\n"
"}\n"
"function crHsRender(){\n"
"  var i = document.getElementById('headSearch');\n"
"  /* the instanceof is a real narrowing, not decoration: gate_types runs tsc\n"
"     --checkJs over these blocks, and `document.getElementById(...).value` is\n"
"     TS2339 on an HTMLElement. The file already carries 1363 of those; this\n"
"     build is not adding to a ratchet it has to live under. */\n"
"  if(!(i instanceof HTMLInputElement)) return;\n"
"  var q = i.value || '';\n"
"  if(String(q).trim().length < 2){ crHsClose(); return; }\n"
"  var m = crHsMatches(q), p = crHsPanel();\n"
"  var rows = m.hits.map(function(pr){\n"
"    var po = (typeof poOf === 'function' && poOf(pr)) ? '#' + poOf(pr) + ' \\u00b7 ' : '';\n"
"    var st = (typeof normStage === 'function') ? normStage(pr.stage) : (pr.stage || '');\n"
"    var meta = po + st + (pr.address ? ' \\u00b7 ' + pr.address : '');\n"
"    return '<button type=\"button\" class=\"hsrow\" role=\"option\" data-hspid=\"' + esc(String(pr.id)) + '\">' +\n"
"      '<span class=\"hsnm\">' + esc(pr.name || 'Client') + '</span>' +\n"
"      '<span class=\"hsmeta\">' + esc(meta) + '</span></button>';\n"
"  }).join('');\n"
"  if(!rows) rows = '<div class=\"hsnone\">No client matches \\u201c' + esc(String(q).trim()) + '\\u201d</div>';\n"
"  else if(m.total > m.hits.length)\n"
"    rows += '<button type=\"button\" class=\"hsfoot\" data-hsall=\"1\">Return for all ' + m.total + ' matches</button>';\n"
"  p.innerHTML = rows;\n"
"  if(crHsPlace()) p.classList.add('open');\n"
"}\n"
"(function(){\n"
"  var i = document.getElementById('headSearch');\n"
"  if(!(i instanceof HTMLInputElement)) return;\n"
"  i.addEventListener('input', crHsRender);\n"
"  i.addEventListener('focus', crHsRender);\n"
"  /* a tap on a row fires mousedown BEFORE blur, so the row must survive long\n"
"     enough to be clicked — the same delay the app's other pop-overs use. */\n"
"  i.addEventListener('blur', function(){ setTimeout(crHsClose, 180); });\n"
"  document.addEventListener('click', function(e){\n"
"    var t = (e.target instanceof Element) ? e.target : null;\n"
"    var row = t ? t.closest('#cr-hsres .hsrow') : null;\n"
"    if(row){\n"
"      e.preventDefault();\n"
"      crHsClose();\n"
"      try{ i.blur(); }catch(_b){}\n"
"      if(typeof openProject === 'function') openProject(row.getAttribute('data-hspid'));\n"
"      return;\n"
"    }\n"
"    if(t && t.closest('#cr-hsres .hsfoot')){\n"
"      /* \u26a0 It PRESSES RETURN rather than re-implementing what Return does.\n"
"         The keydown handler above is the one place that knows how to hand the\n"
"         query to the directory; a second copy here would be the duplicate this\n"
"         whole build exists to avoid, one line after crClientHay was extracted\n"
"         for exactly that reason. */\n"
"      e.preventDefault();\n"
"      crHsClose();\n"
"      try{ i.focus(); }catch(_f){}\n"
"      i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));\n"
"      return;\n"
"    }\n"
"    if(e.target !== i) crHsClose();\n"
"  });\n"
"  addEventListener('resize', function(){ crHsPlace(); });\n"
"  addEventListener('scroll', crHsClose, true);\n"
"})();\n"
)

STAMP_OLD = ">v2026-09-10 build 1206<"
STAMP_NEW = ">v2026-09-10 build 1207<"

CL_ANCHOR = "var CHANGELOG = [\n"
CL_ENTRY = (
    "  { b: 1207, d: '2026-09-10', "
    "t: 'The search box answers while you type', "
    "s: 'Typing in the header search used to do <b>nothing at all</b> until you pressed "
    "Return \\u2014 and nothing on the screen said Return was what it wanted. Now the "
    "<b>top five matching clients appear under the box as you type</b>, with the PO "
    "number, the stage and the address, and tapping one opens that client straight "
    "away. Return still opens the full Clients list filtered the way it always did, "
    "and if there are more than five matches the panel says so. It searches the same "
    "things the Clients list searches \\u2014 name, address, phone, email and PO number "
    "\\u2014 because it now uses the very same matcher, so the five you see can never "
    "disagree with the list Return gives you.' },\n"
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='index.html')
    ap.add_argument('--dst', default=None)
    a = ap.parse_args()
    dst = a.dst or a.src

    src = pl.load(a.src)
    orig = src

    src = pl.sub(src, CSS_OLD, CSS_NEW)
    src = pl.sub(src, HAY_OLD, HAY_NEW)
    src = pl.sub(src, INS_OLD, INS_NEW)
    src = pl.sub(src, JS_OLD, JS_NEW)
    src = pl.sub(src, STAMP_OLD, STAMP_NEW)
    src = pl.sub(src, CL_ANCHOR, CL_ANCHOR + CL_ENTRY)

    # ONE matcher: defined once, and the inline copy is gone from cdMatch
    assert src.count('function crClientHay(') == 1
    # 4 = the definition + three callers (cdMatch, Insurance Clients, the live
    # search). Asserting "2" first, from a guess, is what found the other two.
    assert src.count('crClientHay(pr)') == 4, src.count('crClientHay(pr)')
    # cdMatch's inline copy is gone. ⚠ ONE inline haystack REMAINS, in
    # renderHome(), and it is deliberately left: it omits pr.created_by, so
    # folding it in would silently start matching the Home board on a rep's
    # email address — a behaviour change nobody asked for. Asserted at 1 so a
    # future reader knows it is known rather than missed.
    # exactly one place names created_by in a haystack now: crClientHay itself.
    assert src.count('pr.email, pr.created_by,') == 1, src.count('pr.email, pr.created_by,')
    assert 'I.carrier, I.claim_number, I.policy_number, adj.name, adj.phone\n    ].join' not in src
    assert src.count("var hay = [pr.name, pr.address, pr.phone, phoneHay(pr)") == 1, \
        src.count("var hay = [pr.name, pr.address, pr.phone, phoneHay(pr)")
    # the Return path still exists, untouched in what it does
    # the Return path is REUSED, not copied: the "all N matches" row dispatches
    # a real Enter into the shipped keydown handler, so this count does not move.
    assert src.count('renderClientDirectory();') == orig.count('renderClientDirectory();'), \
        (orig.count('renderClientDirectory();'), src.count('renderClientDirectory();'))
    assert src.count("i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));") == 1
    # every row carries the 1206 floor
    assert src.count('min-height:44px') == orig.count('min-height:44px') + 2

    pl.write_atomic(dst, src)
    print('patched  ->', dst)
    print('  delta bytes:', len(src) - len(orig))


if __name__ == '__main__':
    main()
