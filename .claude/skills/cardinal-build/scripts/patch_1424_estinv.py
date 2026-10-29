#!/usr/bin/env python3
"""Builder E — estimates and invoicing/payments, after judges #2 (Estimates) and #5 (Invoicing & payments).

    python3 patch_1424_estinv.py <in.html> [<out.html>]      (out defaults to in, written atomically)

Every edit is exact-match and SCOPED: bsub() slices the one top-level <script>/<style> block that holds a
unique locator, asserts the anchor's count INSIDE that block, replaces there and re-joins. Nothing is
written unless every edit lands. Payments: display, wording, toasts and visibility only -- no edit here
changes what a payment writes to the database or how one is recorded.
"""
import re, sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else SRC
src = pl.load(SRC)
ORIG = src

RX = re.compile(r'<(script|style)\b[^>]*>', re.I)
def blocks(s):
    out = []; pos = 0
    while True:
        m = RX.search(s, pos)
        if not m: break
        kind = m.group(1).lower(); close = '</' + kind + '>'
        j = s.find(close, m.end())
        if j < 0: raise pl.PatchError('unclosed ' + kind)
        out.append((kind, m.start(), j))
        pos = j + len(close)
    return out

def find_block(s, kind, locator):
    hits = [(a, b) for (k, a, b) in blocks(s) if k == kind and locator in s[a:b]]
    if len(hits) != 1:
        raise pl.PatchError('locator %r is in %d %s blocks' % (locator[:60], len(hits), kind))
    return hits[0]

def bsub(s, kind, locator, old, new, count=1):
    a, b = find_block(s, kind, locator)
    blk = s[a:b]
    n = blk.count(old)
    if n != count:
        raise pl.PatchError('in %s[%s]: expected %d, found %d: %r' % (kind, locator[:40], count, n, old[:100]))
    return s[:a] + blk.replace(old, new) + s[b:]

EST  = '<script id="cr-est-script">'
ESTS = '<style id="cr-est-styles">'
NVL  = '<style id="cr-nvl-styles">'
ASK  = '<script id="cr-ask-script">'
ASKS = '#crAsk .askpick{background:#22262b;'
UNDO = '<script id="cr-undo-script">'
UNDS = '<style id="cr-undo-styles">'
EPUB = '<script id="cr-epub-script">'
MAIN = 'function docRowHtml(r){'          # the main block (one of six bare <script> tags)
AR   = '<script id="cr-ar-script">'
ARS  = '#cr-ar-view .crar-addr{'
JPAY = '<script id="cr-jpay-script">'
JPS  = '<style id="cr-jpay-styles">'
CC   = '<script id="cr-cc-script">'
INVL = '<script id="cr-invl-script">'

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# E1 — the job's measurements carry into the estimate (judge 2, major #1)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', EST,
"function newSecId(){ return 'sc_' + Math.random().toString(36).slice(2, 10); }\n",
"function newSecId(){ return 'sc_' + Math.random().toString(36).slice(2, 10); }\n"
"/* E (judge 2 #1): the job's own measurements -- checklist.meas, which the Measurements box, a Roofr\n"
"   upload and a Hover report all fill -- carried into the estimate, so the rep never types the squares a\n"
"   second time. Numbers only: a blank or unreadable box is \"not measured\", never 0. Roof squares are ROOF\n"
"   area, so they fill Roofing lines only and never siding, whose SQ is wall area. The rep can always\n"
"   overwrite what lands. Nothing here is saved except the quantity itself. */\n"
"function jobMeas(project){\n"
"var ms = null;\n"
"try{ ms = (project && typeof parseCkAll === 'function') ? (parseCkAll(project).meas || null) : null; }catch(_m){ ms = null; }\n"
"if(!ms || typeof ms !== 'object') return null;\n"
"var toMeasNum = function(x0){ var x = parseFloat(String(x0 == null ? '' : x0).replace(/,/g, '')); return (isFinite(x) && x > 0) ? x : 0; };\n"
"var o = { sq:toMeasNum(ms.sq), eave:toMeasNum(ms.eave), rake:toMeasNum(ms.rake), ridge:toMeasNum(ms.ridge), hip:toMeasNum(ms.hip), valley:toMeasNum(ms.valley),\n"
"          ridgehip:toMeasNum(ms.ridgehip), src:String(ms.source || '').trim() };\n"
"return (o.sq || o.eave || o.rake || o.ridge || o.hip || o.valley || o.ridgehip) ? o : null;\n"
"}\n"
"function measFrom(m){ return (m && m.src) ? ' from ' + m.src : ' from this job\\u2019s measurements'; }\n"
"/* a length an assembly line is drawn from: its FIRST key is what the line is about (eaves for a gutter),\n"
"   so without it the template quantity stands; the rest add when measured. Hover reports ridges and hips\n"
"   as one figure -- it answers for the pair together, never for one of them (674's rule). */\n"
"function measLen(m, keys){\n"
"if(!m || !Array.isArray(keys) || !keys.length) return 0;\n"
"var measLenOf = function(k){ return Number(m[k]) || 0; };\n"
"if(keys.indexOf('ridge') !== -1 && keys.indexOf('hip') !== -1 && !measLenOf('ridge') && !measLenOf('hip') && measLenOf('ridgehip')){\n"
"return Math.round((measLenOf('ridgehip') + keys.filter(function(k){ return k !== 'ridge' && k !== 'hip'; }).reduce(function(t, k){ return t + measLenOf(k); }, 0)) * 10) / 10;\n"
"}\n"
"if(!measLenOf(keys[0])) return 0;\n"
"return Math.round(keys.reduce(function(t, k){ return t + measLenOf(k); }, 0) * 10) / 10;\n"
"}\n"
"/* line id -> \"24.3 SQ from Roofr\": a note drawn under a line that was filled from the measurements.\n"
"   Keyed by the in-memory _lid, so it is never saved and goes when the rep types over the number. */\n"
"var measHint = {};\n")

# the whole-house default assemblies take their lengths from the measurements (`from`), and say so (`meas`)
src = bsub(src, 'script', EST,
"{ id:'def-roof-oc', name:'Full Roof Replacement — OC Duration', trade:'Roofing', _default:true, lines:[",
"{ id:'def-roof-oc', name:'Full Roof Replacement — OC Duration', trade:'Roofing', _default:true, meas:true, lines:[")
for old, new in [
  ("{ name:'Ice & Water Shield', description:'Eaves, valleys and penetrations', qty:66, unit:'LF', unit_price:0 },",
   "{ name:'Ice & Water Shield', description:'Eaves, valleys and penetrations', qty:66, unit:'LF', unit_price:0, from:['eave','valley'] },"),
  ("{ name:'Drip edge flashing', description:'Perimeter', qty:150, unit:'LF', unit_price:0 },",
   "{ name:'Drip edge flashing', description:'Perimeter', qty:150, unit:'LF', unit_price:0, from:['eave','rake'] },"),
  ("{ name:'Starter strip shingles', description:'Eaves & rakes', qty:150, unit:'LF', unit_price:0 },",
   "{ name:'Starter strip shingles', description:'Eaves & rakes', qty:150, unit:'LF', unit_price:0, from:['eave','rake'] },"),
  ("{ name:'Shingle-over ridge vent', description:'SkyRunner', qty:30, unit:'LF', unit_price:0 },",
   "{ name:'Shingle-over ridge vent', description:'SkyRunner', qty:30, unit:'LF', unit_price:0, from:['ridge'] },"),
  ("{ name:'Hip & ridge cap shingles', description:'ProEdge / RIZERidge', qty:40, unit:'LF', unit_price:0 },",
   "{ name:'Hip & ridge cap shingles', description:'ProEdge / RIZERidge', qty:40, unit:'LF', unit_price:0, from:['ridge','hip'] },"),
  ("{ id:'def-gutter', name:'Seamless 6\\\" K-Style Gutter & 3x4 Downspout', trade:'Gutters', _default:true, lines:[",
   "{ id:'def-gutter', name:'Seamless 6\\\" K-Style Gutter & 3x4 Downspout', trade:'Gutters', _default:true, meas:true, lines:["),
  ("{ name:'Remove & dispose of existing gutter system', description:'', qty:120, unit:'LF', unit_price:0 },",
   "{ name:'Remove & dispose of existing gutter system', description:'', qty:120, unit:'LF', unit_price:0, from:['eave'] },"),
  ("{ name:'Seamless .032 aluminum 6\\\" K-style gutters', description:'', qty:120, unit:'LF', unit_price:0 },",
   "{ name:'Seamless .032 aluminum 6\\\" K-style gutters', description:'', qty:120, unit:'LF', unit_price:0, from:['eave'] },"),
  ("{ name:'Heavy-duty hidden screw hangers', description:'24\\\" on center', qty:60, unit:'EA', unit_price:0 },",
   "{ name:'Heavy-duty hidden screw hangers', description:'24\\\" on center', qty:60, unit:'EA', unit_price:0, from:['eave'], per:0.5 },"),
  ("{ name:'Micro-mesh leaf gutter guards', description:'Optional', qty:120, unit:'LF', unit_price:0 }",
   "{ name:'Micro-mesh leaf gutter guards', description:'Optional', qty:120, unit:'LF', unit_price:0, from:['eave'] }"),
]:
    src = bsub(src, 'script', EST, old, new)

src = bsub(src, 'script', EST,
"function expandAssembly(a, n){\n"
"return (a.lines || []).map(function(ln){\n"
"var q = Number(ln.qty) || 0;\n"
"if(n > 0){\n"
"if(ln.unit === 'SQ' || ln.per_sq != null) q = (Number(ln.per_sq) || 1) * n;\n"
"else if(ln.per_unit != null) q = (Number(ln.per_unit) || 1) * n;\n"
"}\n",
"function expandAssembly(a, n, m){\n"
"return (a.lines || []).map(function(ln){\n"
"var q = Number(ln.qty) || 0;\n"
"if(n > 0){\n"
"if(ln.unit === 'SQ' || ln.per_sq != null) q = (Number(ln.per_sq) || 1) * n;\n"
"else if(ln.per_unit != null) q = (Number(ln.per_unit) || 1) * n;\n"
"}\n"
"/* E: a length line takes the job's measured length (eaves, rakes, ridges) when there is one. `per` scales\n"
"   it (hangers every 24in = half the eave length, rounded up). from / per / meas never reach the line. */\n"
"var len = (m && ln.from) ? measLen(m, ln.from) : 0;\n"
"if(len > 0) q = ln.per ? Math.ceil(len * Number(ln.per)) : len;\n"
"q = Math.round(q * 100) / 100;   /* 24.3 SQ x 1.1 waste read 26.730000000000004 in the Qty box */\n")
src = bsub(src, 'script', EST,
"function injectAssembly(a, squares){\n"
"if(!state || !a) return;\n"
"var sid = newSecId();\n"
"var name = a.name || 'Section';\n"
"var lines = expandAssembly(a, squares).map(",
"function injectAssembly(a, squares, m){\n"
"if(!state || !a) return;\n"
"var sid = newSecId();\n"
"var name = a.name || 'Section';\n"
"var lines = expandAssembly(a, squares, m).map(")

# the picker: a whole-house assembly opens with the job's squares in its box and says where they came from
src = bsub(src, 'script', EST,
"var scaleNote = hasSq ? ' · scales by squares' : (hasUnit ? ' · scales by count' : '');\n",
"var scaleNote = hasSq ? ' · scales by squares' : (hasUnit ? ' · scales by count' : '');\n"
"/* E: only the assemblies that cover the WHOLE house (meas:true) start from the job's measurements -- a\n"
"   porch accent or a siding job must never inherit the roof's squares. */\n"
"var preSq = (a.meas && hasSq && asmMeas && asmMeas.sq) ? asmMeas.sq : '';\n"
"var nLen = (a.meas && asmMeas) ? (a.lines || []).filter(function(l){ return l.from && measLen(asmMeas, l.from) > 0; }).length : 0;\n"
"var measNote = (preSq || nLen) ? '<div class=\"asm-meas\">' + esc((preSq ? preSq + ' SQ' : '') + (preSq && nLen ? ' and ' : '') +\n"
"(nLen ? nLen + ' length' + (nLen === 1 ? '' : 's') : '') + measFrom(asmMeas) + ' \\u2014 change any of them after you insert.') + '</div>' : '';\n")
src = bsub(src, 'script', EST,
"'<div class=\"asm-meta\">' + (a.lines || []).length + ' line' + ((a.lines || []).length === 1 ? '' : 's') + scaleNote + '</div>' +\n"
"'<div class=\"asm-act\">' +\n"
"((hasSq || hasUnit) ? '<input type=\"number\" class=\"asm-sq\" min=\"0\" step=\"0.1\" inputmode=\"decimal\" placeholder=\"' + scaleLbl + '\" />' : '') +",
"'<div class=\"asm-meta\">' + (a.lines || []).length + ' line' + ((a.lines || []).length === 1 ? '' : 's') + scaleNote + '</div>' +\n"
"measNote +\n"
"'<div class=\"asm-act\">' +\n"
"((hasSq || hasUnit) ? '<input type=\"number\" class=\"asm-sq\" min=\"0\" step=\"0.1\" inputmode=\"decimal\" placeholder=\"' + scaleLbl + '\" aria-label=\"' + scaleLbl + '\"' + (preSq ? ' value=\"' + esc(preSq) + '\"' : '') + ' />' : '') +")
src = bsub(src, 'script', EST,
"var all = EST_ASSEMBLIES.concat(CUSTOM_ASSEMBLIES);\n"
"var q = (pickerQuery || '').toLowerCase();\n",
"var all = EST_ASSEMBLIES.concat(CUSTOM_ASSEMBLIES);\n"
"var asmMeas = jobMeas(state && state.project);   /* E */\n"
"var q = (pickerQuery || '').toLowerCase();\n")
src = bsub(src, 'script', EST,
"var sq = sqEl ? (Number(sqEl.value) || 0) : 0;\n"
"injectAssembly(a, sq);\n",
"var sq = sqEl ? (Number(sqEl.value) || 0) : 0;\n"
"injectAssembly(a, sq, a.meas ? jobMeas(state && state.project) : null);   /* E: whole-house assemblies take the measured lengths */\n")

# From a template: the Roofing line opens at the job's squares
src = bsub(src, 'script', EST,
"  if(lib){\n"
"    state.lines.push({ _lid:newLineId(), library_id:lib.id, name:lib.name, description:lib.description || '',\n"
"      qty:1, unit:lib.unit || '', unit_price:Number(lib.default_price) || 0, amount:Number(lib.default_price) || 0 });\n",
"  if(lib){\n"
"    /* E (judge 2 #1): the job's measured squares, not 1 -- Roofing SQ only (see jobMeas) */\n"
"    var _tm = (String(lib.unit || '').toUpperCase() === 'SQ' && t.cat === 'Roofing') ? jobMeas(project) : null;\n"
"    var _tl = newLineId();\n"
"    state.lines.push({ _lid:_tl, library_id:lib.id, name:lib.name, description:lib.description || '',\n"
"      qty:(_tm && _tm.sq) ? _tm.sq : 1, unit:lib.unit || '', unit_price:Number(lib.default_price) || 0, amount:Number(lib.default_price) || 0 });\n"
"    if(_tm && _tm.sq) measHint[_tl] = _tm.sq + ' SQ' + measFrom(_tm);\n")

# + From Library: a Roofing SQ line takes the squares, a Gutters LF line takes the eaves
src = bsub(src, 'script', EST,
"var lib = window.CardinalLineItems && window.CardinalLineItems.byId(id);\n"
"if(!lib) return;\n"
"state.lines.push({\n"
"_lid       : newLineId(),\n"
"library_id : lib.id,\n"
"name       : lib.name,\n"
"description: lib.description || '',\n"
"qty        : 1,\n",
"var lib = window.CardinalLineItems && window.CardinalLineItems.byId(id);\n"
"if(!lib) return;\n"
"/* E (judge 2 #1): roof squares fill a Roofing SQ line, the eave length a Gutters LF line; anything else\n"
"   opens at 1 as before. */\n"
"var _pm = jobMeas(state.project), _pu = String(lib.unit || '').toUpperCase(), _pc = String(lib.category || '').toLowerCase();\n"
"var _pq = 1, _ph = '', _pl = newLineId();\n"
"if(_pm && _pu === 'SQ' && _pc === 'roofing' && _pm.sq){ _pq = _pm.sq; _ph = _pm.sq + ' SQ' + measFrom(_pm); }\n"
"else if(_pm && _pu === 'LF' && _pc === 'gutters' && _pm.eave){ _pq = _pm.eave; _ph = _pm.eave + ' LF of eaves' + measFrom(_pm); }\n"
"if(_ph) measHint[_pl] = _ph;\n"
"state._dirty = true;\n"
"state.lines.push({\n"
"_lid       : _pl,\n"
"library_id : lib.id,\n"
"name       : lib.name,\n"
"description: lib.description || '',\n"
"qty        : _pq,\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# E4 — the numbers row is labelled, and its fields are 44px (judge 2 minor #1, part of major #5)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', EST,
"? '<div class=\"pricing\">' +\n"
"'<input type=\"number\" data-lf=\"qty\" value=\"' + esc(l.qty != null ? l.qty : 1) + '\" step=\"0.01\" min=\"0\" inputmode=\"decimal\" placeholder=\"Qty\" />' +\n"
"'<select class=\"unit-sel\" data-lf=\"unit\">' +\n",
"? '<div class=\"pricing\">' +\n"
"/* E (judge 2): a placeholder is a label only until the box has a number in it. Each field now carries a\n"
"   word above it and an aria-label, so \"24.3 | SQ | 525\" reads as quantity, unit and price each. */\n"
"'<label class=\"pf\"><span>Qty</span><input type=\"number\" data-lf=\"qty\" value=\"' + esc(l.qty != null ? l.qty : 1) + '\" step=\"0.01\" min=\"0\" inputmode=\"decimal\" placeholder=\"Qty\" aria-label=\"Quantity\" /></label>' +\n"
"'<label class=\"pf\"><span>Unit</span><select class=\"unit-sel\" data-lf=\"unit\" aria-label=\"Unit\">' +\n")
src = bsub(src, 'script', EST,
"'</select>' +\n"
"'<input type=\"number\" data-lf=\"unit_price\" value=\"' + esc(l.unit_price != null ? l.unit_price : 0) + '\" step=\"0.01\" min=\"0\" inputmode=\"decimal\" placeholder=\"Unit $\" />' +\n"
"'<div class=\"amount\" data-slot=\"amount\">' + money(amt) + '</div>' +\n"
"'</div>'\n",
"'</select></label>' +\n"
"'<label class=\"pf\"><span>Price each</span><input type=\"number\" data-lf=\"unit_price\" value=\"' + esc(l.unit_price != null ? l.unit_price : 0) + '\" step=\"0.01\" min=\"0\" inputmode=\"decimal\" placeholder=\"Unit $\" aria-label=\"Price each\" /></label>' +\n"
"'<div class=\"amount\" data-slot=\"amount\">' + money(amt) + '</div>' +\n"
"'</div>' +\n"
"(measHint[l._lid] ? '<div class=\"cr-est-meashint\">' + esc(measHint[l._lid]) + ' \\u2014 change it if this job needs more.</div>' : '')\n")
src = bsub(src, 'script', EST,
"'<span class=\"lump-lbl\">Amount</span>' +\n"
"'<input type=\"number\" data-lf=\"amount\" value=\"' + esc(l.amount != null ? l.amount : 0) + '\" step=\"0.01\" min=\"0\" inputmode=\"decimal\" placeholder=\"0.00\" />' +\n",
"'<span class=\"lump-lbl\">Amount</span>' +\n"
"'<input type=\"number\" data-lf=\"amount\" value=\"' + esc(l.amount != null ? l.amount : 0) + '\" step=\"0.01\" min=\"0\" inputmode=\"decimal\" placeholder=\"0.00\" aria-label=\"Amount\" />' +\n")
# typing over a filled number retires its "from Roofr" note
src = bsub(src, 'script', EST,
"if(field === 'qty' || field === 'unit_price' || field === 'amount'){\n"
"line[field] = Number(v) || 0;\n"
"refreshTotals();\n",
"if(field === 'qty' || field === 'unit_price' || field === 'amount'){\n"
"line[field] = Number(v) || 0;\n"
"if(field === 'qty' && measHint[lid]){ delete measHint[lid]; var _mh = row.querySelector('.cr-est-meashint'); if(_mh) _mh.remove(); }   /* E */\n"
"refreshTotals();\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# E3 — Remove has an Undo, and every change marks the draft unsaved (judge 2 major #5)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', EST,
"row.querySelector('[data-act=\"del-line\"]').onclick = function(){\n"
"state.lines = state.lines.filter(function(l){ return l._lid !== lid; });\n"
"render();\n"
"};\n",
"row.querySelector('[data-act=\"del-line\"]').onclick = function(){\n"
"/* E (judge 2 #5): one tap took a priced line with no way back. It still goes on one tap -- a confirm on\n"
"   every line is its own tax -- and the app's one undo toast (CardinalUndo) brings it back to the same\n"
"   place, in the same section, for six seconds. The undo is a no-op once this estimate is closed. */\n"
"var at = state.lines.findIndex(function(l){ return l._lid === lid; });\n"
"if(at < 0) return;\n"
"var gone = state.lines[at], s0 = state;\n"
"state.lines.splice(at, 1);\n"
"state._dirty = true;\n"
"render();\n"
"var U = window.CardinalUndo;\n"
"if(U && typeof U.enqueue === 'function'){\n"
"U.enqueue('Removed \\u201c' + (String(gone.name || '').trim() || 'Untitled item') + '\\u201d', function(){\n"
"if(state !== s0) return;\n"
"state.lines.splice(Math.min(at, state.lines.length), 0, gone);\n"
"state._dirty = true;\n"
"render();\n"
"}, 6000);\n"
"var _ut = document.querySelector('.cr-undo-toast'); if(_ut) _ut.classList.add('estundo');\n"
"}\n"
"};\n")
src = bsub(src, 'script', EST,
"var tmp = state.lines[i];\n"
"state.lines[i] = state.lines[j];\n"
"state.lines[j] = tmp;\n"
"render();\n"
"}\n",
"var tmp = state.lines[i];\n"
"state.lines[i] = state.lines[j];\n"
"state.lines[j] = tmp;\n"
"state._dirty = true;   /* E: a reorder is an edit, so Close asks about it */\n"
"render();\n"
"}\n")
src = bsub(src, 'script', EST,
"view.addEventListener('change', function(){ if(state) state._dirty = true; }, true);\n",
"view.addEventListener('change', function(){ if(state) state._dirty = true; }, true);\n"
"/* E: the buttons that change the estimate without an input event -- + Custom, a photo removed, moved or\n"
"   starred, a section moved or added -- used to leave it \"clean\", so Close discarded them without asking. */\n"
"view.addEventListener('click', function(e){\n"
"var b = (e.target instanceof Element) ? e.target.closest('[data-act]') : null;\n"
"if(b && state && /^(add-custom|add-section|sec-addline|sec-up|sec-down|del-photo|pmove-up|pmove-down|set-cover|mode-detailed|mode-flat)$/.test(b.getAttribute('data-act') || '')) state._dirty = true;\n"
"}, true);\n")
src = bsub(src, 'script', EST,
"state.lines.push({\n"
"_lid       : newLineId(),\n"
"library_id : null,\n"
"abc_item   : num,\n",
"state._dirty = true;   /* E */\n"
"state.lines.push({\n"
"_lid       : newLineId(),\n"
"library_id : null,\n"
"abc_item   : num,\n")
src = bsub(src, 'script', EST,
"var added = selected\n",
"state._dirty = true;   /* E: the photo set changed */\n"
"var added = selected\n")
src = bsub(src, 'script', EST,
"function close(){\n"
"if(view) view.classList.remove('open');\n"
"document.body.style.overflow = '';\n"
"state = null;\n"
"}\n",
"function close(){\n"
"if(view) view.classList.remove('open');\n"
"document.body.style.overflow = '';\n"
"state = null;\n"
"/* E: a Removed-line undo belongs to the estimate that just closed */\n"
"try{ if(document.querySelector('.cr-undo-toast.estundo') && window.CardinalUndo) window.CardinalUndo.dismiss(); }catch(_u){}\n"
"}\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# E2 — the unsaved-changes sheet: the safe choice is the filled one, and each says what it does
#      (judge 2 major #4)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', EST,
"if(state && state._dirty && !await crAsk('You have unsaved changes.\\n\\nClose without saving?')) return;\n"
"close();\n",
"/* E (judge 2 #4): this asked \"Close without saving?\" with one blue CONTINUE -- the button that threw the\n"
"   work away, under a word that reads as \"keep going\". Three journeys now, each named for what it does:\n"
"   Save and close (the filled one), Discard changes (red words), Keep editing (Cancel, and the scrim). */\n"
"if(state && state._dirty){\n"
"var _pick = await crAsk('You have unsaved changes.\\n\\nSave them before you close, or discard them.', {\n"
"choices: [ { id:'save', label:'Save and close', hint:'Keeps every change you made', tone:'primary' },\n"
"           { id:'discard', label:'Discard changes', hint:'Closes without saving \\u2014 the last saved version stays', tone:'danger' } ],\n"
"cancel: 'Keep editing' });\n"
"if(_pick === 'save'){ try{ await save(); }catch(_s){ return; } close(); return; }   /* save() already said why */\n"
"if(_pick !== 'discard') return;\n"
"}\n"
"close();\n")
# crAsk: a choice may carry a tone (additive -- every existing caller passes none and is unchanged)
src = bsub(src, 'script', ASK,
"          b.className = 'askpick';\n",
"          /* E: an optional tone. 'primary' fills the choice in the sheet's own safe-go colour; 'danger'\n"
"             writes it in red words (Buttons A). No tone = exactly the 1201 choice. */\n"
"          b.className = 'askpick' + (c.tone === 'primary' ? ' askprime' : (c.tone === 'danger' ? ' askdanger' : ''));\n")
src = bsub(src, 'style', ASKS,
":root[data-theme=\"rb-light\"] #crAsk .askpick small{color:#5f6670;}\n",
":root[data-theme=\"rb-light\"] #crAsk .askpick small{color:#5f6670;}\n"
"/* E: a choice's tone. The safe journey wears .askgo.plain's own fill (#fff on #2d5578, 7.83:1; its hint\n"
"   #dce7f2, 6.25:1). A destructive one is red words: #ff9aa0 on #22262b 7.52:1, #b3121f on #f7f7f8 6.49:1. */\n"
"#crAsk .askpick.askprime{background:#2d5578;color:#fff;border-color:#2d5578;}\n"
"#crAsk .askpick.askprime small{color:#dce7f2;}\n"
"#crAsk .askpick.askdanger{color:#ff9aa0;}\n"
":root[data-theme=\"rb-light\"] #crAsk .askpick.askprime{background:#2d5578;color:#fff;border-color:#2d5578;}\n"
":root[data-theme=\"rb-light\"] #crAsk .askpick.askprime small{color:#dce7f2;}\n"
":root[data-theme=\"rb-light\"] #crAsk .askpick.askdanger{color:#b3121f;}\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# E3/E4 CSS — 44px line controls with Remove set apart, 44px number fields, the labels (edited at source)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'style', ESTS,
".cr-est-lineitem .pricing{display:grid;grid-template-columns:80px 60px 110px 1fr;gap:8px;align-items:center;margin-top:10px;padding-top:10px;border-top:1px dashed #e8d9a8}",
".cr-est-lineitem .pricing{display:grid;grid-template-columns:80px 76px 110px 1fr;gap:8px;align-items:end;margin-top:10px;padding-top:10px;border-top:1px dashed #e8d9a8}"
"\n/* E (judge 2): the word above each number. --est-dim is #475569: 7.58:1 on the white card. */\n"
".cr-est-lineitem .pricing .pf{display:flex;flex-direction:column;gap:3px;min-width:0;margin:0}"
".cr-est-lineitem .pricing .pf>span{font:800 11px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--est-dim,#475569);white-space:nowrap}"
".cr-est-meashint{margin-top:8px;font:600 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--est-dim,#475569)}"
"#cr-est-picker .asm-meas{margin:6px 0 0;font:600 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--est-dim,#475569)}")
src = bsub(src, 'style', ESTS,
".cr-est-lineitem .pricing input,.cr-est-lineitem .pricing select{padding:6px 8px;font-size:13px;text-align:right}",
".cr-est-lineitem .pricing input,.cr-est-lineitem .pricing select{padding:6px 8px;font-size:13px;text-align:right;min-height:44px;box-sizing:border-box}")
src = bsub(src, 'style', ESTS,
".cr-est-lineitem .del{position:absolute;top:8px;right:8px;background:transparent;border:0;cursor:pointer;color:#767066;font-size:18px;line-height:1;padding:4px 8px}",
"/* E (judge 2 #5): the line's ▲ ▼ and ✕ were 26x26 / 26x26 / 31x26, side by side. All three are 44px now,\n"
"   and ✕ stands 12px clear of ▼ in red ink (#b3121f, 6.95:1 on the card) so it never reads as a third arrow. */\n"
".cr-est-lineitem .del{position:absolute;top:6px;right:6px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:transparent;border:0;border-radius:8px;cursor:pointer;color:#b3121f;font-size:20px;line-height:1;padding:0}")
src = bsub(src, 'style', ESTS,
".cr-est-move{position:absolute;top:8px;right:38px;display:flex;gap:2px}",
".cr-est-move{position:absolute;top:6px;right:62px;display:flex;gap:4px}")
src = bsub(src, 'style', ESTS,
"@media (max-width:560px){ .cr-est-lineitem{padding-top:40px} ",
"@media (max-width:560px){ .cr-est-lineitem{padding-top:58px} ")
src = bsub(src, 'style', ESTS,
".cr-est-move button{width:26px;height:26px;border:1px solid #e8d9a8;background:#f4f2f1;color:#8f1620;border-radius:5px;cursor:pointer;font-size:11px;",
".cr-est-move button{width:44px;height:44px;border:1px solid #e8d9a8;background:#f4f2f1;color:#8f1620;border-radius:8px;cursor:pointer;font-size:14px;")
# the name field's clearance under the (now wider) controls: desktop only -- on a phone they have their own row
src = bsub(src, 'style', NVL,
"  width:100%;box-sizing:border-box;padding-right:104px;}\n",
"  width:100%;box-sizing:border-box;}\n"
"/* E: the 44px controls take 152px beside the name, so on a wider screen the name field stops short of them\n"
"   (its box used to run under the arrows). On a phone they have their own row and the name keeps the width. */\n"
"@media (min-width:561px){ #cr-est-view .cr-est-lineitem .name-input{width:calc(100% - 152px);} }\n")

# the undo toast: its Undo was 24px tall and #c8202e on #1a1a1a (3.07:1). Edited at source, for every caller.
src = bsub(src, 'style', UNDS,
"max-width:92vw;box-shadow:0 8px 30px rgba(0,0,0,.55);",
"width:max-content;max-width:calc(100vw - 32px);box-shadow:0 8px 30px rgba(0,0,0,.55);")
src = bsub(src, 'style', UNDS,
".cr-undo-toast .btn{background:transparent;border:1px solid #c8202e;color:#c8202e;padding:5px 11px;",
".cr-undo-toast .btn{background:transparent;border:1px solid #e35c63;color:#ff8a90;min-height:44px;min-width:64px;padding:5px 11px;")
src = bsub(src, 'style', UNDS,
".cr-undo-toast .btn:hover{background:rgba(200,32,46,.15)}",
".cr-undo-toast .btn:hover{background:rgba(200,32,46,.15)}"
"\n/* E: over the estimate builder on a phone the toast rides above its Save / Email / Publish bar */\n"
"@media (max-width:700px){ .cr-undo-toast.estundo{bottom:calc(84px + env(safe-area-inset-bottom,0px))} }")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# E5 — one card per published estimate, in the builder's words, and Mark sent / unsent moves the estimate
#      (judge 2 major #2)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', MAIN,
"var estDocIds = {}; /* 1011: ",
"var estByDoc = {};  /* E (judge 2 #2): doc_id -> the estimates row that published it (id, status), so the profile shows ONE card per estimate */\n"
"var estDocIds = {}; /* 1011: ")
src = bsub(src, 'script', MAIN,
"  estTier = {};\n  estDocIds = {};\n  (estimates || []).forEach(function(e){\n",
"  estTier = {};\n  estDocIds = {};\n  estByDoc = {};\n  (estimates || []).forEach(function(e){\n")
src = bsub(src, 'script', MAIN,
"    if(e.doc_id) estDocIds[e.doc_id] = 1;\n",
"    if(e.doc_id){ estDocIds[e.doc_id] = 1; estByDoc[e.doc_id] = e; }\n")
# keep the card honest between reloads: the builder's Save and the send paths both announce a status
src = bsub(src, 'script', MAIN,
"function crAcceptEstimateForDoc(docId){\n",
"/* E (judge 2 #2): a published estimate's card reads its estimates row through estByDoc, which a reload\n"
"   rebuilds. Between reloads the builder's Save (cr-est-saved) and the send paths (cr-est-status) say what\n"
"   changed, so the card follows them instead of lagging one reload behind. */\n"
"function crEstCardSync(id, status, row){\n"
"  var hit = false;\n"
"  if(row && row.doc_id){ estByDoc[row.doc_id] = Object.assign(estByDoc[row.doc_id] || {}, { id:row.id, status:row.status, doc_id:row.doc_id }); hit = true; }\n"
"  else if(id && status){ Object.keys(estByDoc).forEach(function(k){ var e = estByDoc[k]; if(e && String(e.id) === String(id)){ e.status = status; hit = true; } }); }\n"
"  if(hit && currentProject){ try{ renderProjectDocs(); }catch(_r){} }\n"
"}\n"
"document.addEventListener('cr-est-status', function(ev){ var d = (ev && /** @type {any} */ (ev).detail) || {}; crEstCardSync(d.id, d.status, null); });\n"
"document.addEventListener('cr-est-saved', function(ev){ var d = (ev && /** @type {any} */ (ev).detail) || {}; crEstCardSync(d.id, d.status, d.row || null); });\n"
"function crAcceptEstimateForDoc(docId){\n")
src = bsub(src, 'script', MAIN,
"  var toggleLabel = r.status === 'sent' ? 'Mark unsent' : 'Mark sent';\n"
"  var by = r.created_by ? ' · by ' + esc(r.created_by) : '';\n"
"  var pr0 = r.project_id ? cacheProjects.find(function(x){ return x.id === r.project_id; }) : null;\n"
"  var cli = pr0 ? ' · ' + esc(pr0.name) : (r.project ? ' · ' + esc(r.project) : '');\n"
"  var k = docKind(r.title);\n"
"  return '<tr>' +\n"
"    '<td class=\"title\"><b>' + esc(r.title || 'Untitled') + '</b>' +\n"
"      '<span class=\"ref\">ID ' + esc(String(r.id).slice(0,8)) + cli + by + '</span></td>' +\n",
"  /* E (judge 2 #2): a PUBLISHED estimate is one card, not two. Its estimates row (linked by doc_id) used to\n"
"     sit above this as a second \"Saved estimate\" with its own status, its own \\u2715 and its own way in, and\n"
"     Mark sent here moved only this half. The card now carries the estimate's own status in the builder's\n"
"     words (Draft / Sent / Accepted / Declined), opens the builder first, and shows no internal id. A\n"
"     signature still reads SIGNED -- the stronger state, as 884 set it. */\n"
"  var _isEst = isEstimateDoc(r);\n"
"  var _le = (_isEst && estByDoc && estByDoc[r.id] && !estByDoc[r.id].archived) ? estByDoc[r.id] : null;   /* an archived estimate keeps the old card */\n"
"  if(_le && !r.signed_at){\n"
"    var _es = String(_le.status || 'draft').toLowerCase();\n"
"    statusCell = _es === 'accepted' ? '<span class=\"chip signed\">ACCEPTED</span>'\n"
"               : _es === 'declined' ? '<span class=\"chip unsent\">DECLINED</span>'\n"
"               : _es === 'sent' ? '<span class=\"chip sent\">SENT</span>' + (r.sent_at ? '<small>Sent ' + fmtDay(r.sent_at) + '</small>' : '')\n"
"               : '<span class=\"chip unsent\">DRAFT</span>';\n"
"  }\n"
"  var toggleLabel = r.status === 'sent' ? 'Mark unsent' : 'Mark sent';\n"
"  var by = r.created_by ? ' · by ' + esc(r.created_by) : '';\n"
"  var pr0 = r.project_id ? cacheProjects.find(function(x){ return x.id === r.project_id; }) : null;\n"
"  var cli = pr0 ? ' · ' + esc(pr0.name) : (r.project ? ' · ' + esc(r.project) : '');\n"
"  var k = docKind(r.title);\n"
"  var _ref = _isEst\n"
"    ? (pr0 ? esc(pr0.name) : (r.project ? esc(r.project) : '')) +\n"
"      (r.created_by ? ' · by ' + esc((typeof rptRepName === 'function' && rptRepName(r.created_by)) || String(r.created_by).split('@')[0]) : '')\n"
"    : 'ID ' + esc(String(r.id).slice(0,8)) + cli + by;\n"
"  return '<tr>' +\n"
"    '<td class=\"title\"><b>' + esc(r.title || 'Untitled') + '</b>' +\n"
"      '<span class=\"ref\">' + _ref + '</span></td>' +\n")
src = bsub(src, 'script', MAIN,
"      '<button class=\"chipbtn\" data-act=\"open\" data-id=\"'+r.id+'\">Open / Edit</button>' +\n"
"      '<button class=\"chipbtn\" data-act=\"toggle\" data-id=\"'+r.id+'\">'+toggleLabel+'</button>' +\n",
"      (_le ? '<button class=\"chipbtn\" data-act=\"estedit\" data-id=\"'+r.id+'\" data-eid=\"'+esc(String(_le.id))+'\">Edit estimate</button>' +\n"
"             '<button class=\"chipbtn\" data-act=\"open\" data-id=\"'+r.id+'\">Open document</button>'\n"
"           : '<button class=\"chipbtn\" data-act=\"open\" data-id=\"'+r.id+'\">Open / Edit</button>') +\n"
"      '<button class=\"chipbtn\" data-act=\"toggle\" data-id=\"'+r.id+'\">'+toggleLabel+'</button>' +\n")
src = bsub(src, 'script', MAIN,
"      '<button class=\"chipbtn\" data-act=\"download\" data-id=\"'+r.id+'\">Download</button>' +\n"
"      '<button class=\"chipbtn\" data-act=\"dup\" data-id=\"'+r.id+'\">Duplicate</button>' +\n",
"      '<button class=\"chipbtn\" data-act=\"download\" data-id=\"'+r.id+'\">Download</button>' +\n"
"      (_le ? '' : '<button class=\"chipbtn\" data-act=\"dup\" data-id=\"'+r.id+'\">Duplicate</button>') +   /* E: an estimate duplicates in the builder */\n")
src = bsub(src, 'script', MAIN,
"    if(act === 'open'){ await openEditor(id); return; }\n",
"    if(act === 'open'){ await openEditor(id); return; }\n"
"    if(act === 'estedit'){   /* E: the builder is where an estimate is changed */\n"
"      var _eid = b.getAttribute('data-eid');\n"
"      if(_eid && window.CardinalEstimates && typeof window.CardinalEstimates.openById === 'function') await window.CardinalEstimates.openById(_eid);\n"
"      return;\n"
"    }\n")
src = bsub(src, 'script', MAIN,
"      await db.update(id, { status: toSent ? 'sent' : 'unsent', sent_at: sAt });\n"
"      /* 723: a work order's dispatch lives on it",
"      await db.update(id, { status: toSent ? 'sent' : 'unsent', sent_at: sAt });\n"
"      /* E (judge 2 #2): a published estimate's Mark sent moved only the document, so the profile read DRAFT\n"
"         and SENT for one estimate. Sent goes through the one announcement the editor's own Mark sent and\n"
"         Email already make (crDocSent -> 1399's listener: Draft -> Sent, the pipeline stage with it).\n"
"         Unsent takes a Sent estimate back to Draft -- never an Accepted or a Declined one. */\n"
"      if(isEstimateDoc(row)){\n"
"        if(toSent) crDocSent(id);\n"
"        else{\n"
"          try{\n"
"            var _ud = await sb.from('estimates').update({ status:'draft' }).eq('doc_id', id).eq('status', 'sent').select('id');\n"
"            if(_ud && !_ud.error && _ud.data && _ud.data.length){\n"
"              try{ document.dispatchEvent(new CustomEvent('cr-est-status', { detail: { id: _ud.data[0].id, status: 'draft' } })); }catch(_ev){}\n"
"            }\n"
"          }catch(_u){}\n"
"        }\n"
"      }\n"
"      /* 723: a work order's dispatch lives on it")
src = bsub(src, 'script', MAIN,
"  try{ crRenderTrash(); }catch(_t){}   /* 1345 */\n}\n",
"  try{ crRenderTrash(); }catch(_t){}   /* 1345 */\n"
"  /* E: the builder's \"not published yet\" list hides what this table now shows, so it re-reads the table */\n"
"  try{ if(window.CardinalEstimates && typeof window.CardinalEstimates.refilterSaved === 'function') window.CardinalEstimates.refilterSaved(); }catch(_rs){}\n"
"}\n")

# the builder's saved list keeps only the estimates that have not been published
src = bsub(src, 'script', EST,
"var rows = await loadForProject(pid);\n"
"if(!rows.length){\n"
"host.innerHTML = '';\n"
"return;\n"
"}\n"
"host.innerHTML =\n"
"'<div class=\"head\">Saved Estimates (' + rows.length + ')</div>' +\n",
"var rows = await loadForProject(pid);\n"
"savedLast = { pid: pid, rows: rows };\n"
"paintSaved();\n"
"}\n"
"/* E (judge 2 #2): a PUBLISHED estimate appears once -- on its document's card in the Estimates table,\n"
"   which carries Edit estimate and the estimate's own status. This list keeps the ones nobody has\n"
"   published yet. An estimate whose card cannot offer Edit estimate (no money-index link yet) stays here,\n"
"   so no estimate is ever left with no way into the builder. */\n"
"var savedLast = null;\n"
"function estPublished(e, pid){\n"
"if(!e || !e.doc_id) return false;\n"
"var by = /** @type {any} */ (window).estByDoc;\n"
"if(!by || !by[e.doc_id]) return false;\n"
"return (/** @type {any} */ (window).cacheRows || []).some(function(r){ return r && String(r.id) === String(e.doc_id) && String(r.project_id) === String(pid); });\n"
"}\n"
"function paintSaved(){\n"
"var host = document.getElementById('cr-est-saved-slot');\n"
"if(!host || !savedLast) return;\n"
"var pid = savedLast.pid;\n"
"if(window.currentProject && String(window.currentProject.id) !== String(pid)) return;\n"
"var rows = savedLast.rows.filter(function(e){ return !estPublished(e, pid); });\n"
"if(!rows.length){\n"
"host.innerHTML = '';\n"
"return;\n"
"}\n"
"host.innerHTML =\n"
"'<div class=\"head\">Not published yet (' + rows.length + ')</div>' +\n")
src = bsub(src, 'script', EST,
"refreshSavedList : refreshSavedList,\n",
"refreshSavedList : refreshSavedList,\n"
"refilterSaved    : function(){ try{ paintSaved(); }catch(_p){} },   /* E */\n"
"openById         : openById,                                       /* E: Edit estimate on a published estimate's card */\n")
src = bsub(src, 'script', EST,
"function buildDefaultTitle(project){\n",
"/* E: open a saved estimate by its id -- the full row is read fresh, as creOpenSaved does */\n"
"async function openById(id){\n"
"if(!window.supa || !id){ crTell('No connection \\u2014 try again when you are back online.'); return false; }\n"
"var r;\n"
"try{ r = await window.supa.from('estimates').select('*').eq('id', id).maybeSingle(); }\n"
"catch(e){ crTell('Could not open the estimate: ' + ((e && e.message) || e)); return false; }\n"
"if(r && r.error){ crTell('Could not open the estimate: ' + r.error.message); return false; }\n"
"if(!r || !r.data){ crTell('That estimate is no longer there.'); return false; }\n"
"openEditor(r.data.project_id, r.data);\n"
"return true;\n"
"}\n"
"function buildDefaultTitle(project){\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# E7 — a printed estimate carries its totals once, after the last line (documents judge, major)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', EPUB,
"'table.items tfoot{break-inside:avoid}\\n' +\n",
"'table.items tfoot{break-inside:avoid}\\n' +\n"
"/* E: a <tfoot> repeats at the foot of EVERY printed page, so a 10-line estimate printed \"TOTAL $16,167.30\"\n"
"   under the first four lines. As a row group it prints once, after the last line. */\n"
"'@media print{table.items tfoot{display:table-row-group}}\\n' +\n")
src = bsub(src, 'script', MAIN,
"  #cr-inv-ledger tr{page-break-inside:avoid;}\n",
"  #cr-inv-ledger tr{page-break-inside:avoid;}\n"
"  #cr-inv-ledger tfoot{display:table-row-group;}   /* E: Total paid once, after the last payment */\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# E8 — Options is the Good / Better / Best sheet, and Generate waits for two estimates (judge 2 minor)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', EPUB,
"ob.textContent = 'Options';\n",
"ob.textContent = 'Good / Better / Best';   /* E: it builds a sheet from two or more saved estimates -- not options on this one */\n")
src = bsub(src, 'script', EPUB,
"function gbbClosePick(){\n",
"/* E: Generate stays off until two different estimates are chosen -- it used to stay a live red button\n"
"   that only changed the message. */\n"
"function gbbSyncGo(){\n"
"  if(!gbbPickEl) return;\n"
"  var go = gbbPickEl.querySelector('[data-act=\"gbbp-go\"]');\n"
"  if(!(go instanceof HTMLButtonElement) || go.textContent === 'Generating\\u2026') return;\n"
"  var seen = {}, n = 0;\n"
"  Array.prototype.forEach.call(gbbPickEl.querySelectorAll('.gbbp-est'), function(s){ if(s.value && !seen[s.value]){ seen[s.value] = 1; n++; } });\n"
"  go.disabled = n < 2;\n"
"  go.title = n < 2 ? 'Choose at least two different estimates' : '';\n"
"}\n"
"function gbbClosePick(){\n")
src = bsub(src, 'script', EPUB,
"  rows.innerHTML = '<p class=\"gbbp-loading\">Loading this client’s estimates…</p>';\n"
"  gbbPickEl.classList.add('open');\n",
"  rows.innerHTML = '<p class=\"gbbp-loading\">Loading this client’s estimates…</p>';\n"
"  rows.onchange = gbbSyncGo;   /* E */\n"
"  gbbSyncGo();\n"
"  gbbPickEl.classList.add('open');\n")
src = bsub(src, 'script', EPUB,
"    hint.textContent = 'You need at least two saved estimates on this client to build an options sheet. Tip: open one estimate, use Duplicate to make a copy, change the shingle, and Save — that is your second tier.';\n"
"    return;\n",
"    hint.textContent = 'You need at least two saved estimates on this client to build an options sheet. Tip: open one estimate, use Duplicate to make a copy, change the shingle, and Save — that is your second tier.';\n"
"    gbbSyncGo();\n"
"    return;\n")
src = bsub(src, 'script', EPUB,
"    gbbRowHtml('Best',   ests, pre[2] && pre[2].id);\n",
"    gbbRowHtml('Best',   ests, pre[2] && pre[2].id);\n"
"  gbbSyncGo();\n")
src = bsub(src, 'script', EPUB,
"    if(goBtn){ goBtn.disabled = false; goBtn.textContent = 'Generate document'; }\n",
"    if(goBtn){ goBtn.disabled = false; goBtn.textContent = 'Generate document'; }\n"
"    gbbSyncGo();\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# I1 — the invoice pill answers "what state is this invoice in" (judge 5 major #1)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', AR,
"  /* how many payments have landed — deposit-vs-partial labelling */\n"
"  function collCount(pid){\n"
"    var n = 0;\n"
"    collections().forEach(function(c){ if(c && c.project_id === pid) n++; });\n"
"    return n;\n"
"  }\n"
"  /* THE STATUS ENGINE — derived from the ledger, not a stored machine.\n"
"     paid >= billed -> Paid in Full; paid > 0 -> Deposit/Partially Paid;\n"
"     else the document's own unsent/sent -> Draft / Sent. */\n"
"  function statusFor(pr, inv, fin){\n"
"    fin = fin || jobFinance(pr);\n"
"    var billed = Number(fin.value) || 0, paid = Number(fin.paid) || 0;\n"
"    if(billed > 0 && paid >= billed - 0.005) return { k:'paid', label:'Paid in Full' };\n"
"    if(paid > 0.005) return (collCount(pr.id) <= 1)\n"
"      ? { k:'part', label:'Deposit Paid' }\n"
"      : { k:'part', label:'Partially Paid' };\n"
"    if(inv && inv.status === 'sent') return { k:'sent', label:'Sent' };\n"
"    return { k:'draft', label:'Draft' };\n"
"  }\n",
"  /* THE STATUS ENGINE — derived from the ledger and the invoice, not a stored machine.\n"
"     E (judge 5 #1): it used to label from the ledger alone -- one payment and every job read \"Deposit\n"
"     Paid\": a job 40 days overdue with $10,000 owed, an invoice nobody had sent, a job with no invoice at\n"
"     all. The pill now answers ONE question, what state is this invoice in, in one vocabulary on Invoices &\n"
"     AR, the job's card and the invoice itself:\n"
"       Paid in full · Overdue (sent, owed, past 30 days -- the red group, never a carrier wait) ·\n"
"       Partly paid (sent, some paid) · Sent · Draft (made, not sent) · No invoice.\n"
"     What was paid stays in the sub-line (\"Paid $5,000 of $15,000\"), where it always was. */\n"
"  function statusFor(pr, inv, fin){\n"
"    fin = fin || jobFinance(pr);\n"
"    var billed = Number(fin.value) || 0, paid = Number(fin.paid) || 0;\n"
"    if(billed > 0 && paid >= billed - 0.005) return { k:'paid', label:'Paid in full' };\n"
"    if(!inv) return { k:'none', label:'No invoice' };\n"
"    if(inv.status !== 'sent') return { k:'draft', label:'Draft' };\n"
"    var carrier = stg(pr) === 'Invoiced' && (typeof projClaimType === 'function') && projClaimType(pr) === 'insurance';\n"
"    if(!carrier && ageDays(pr, inv) > 30) return { k:'over', label:'Overdue' };\n"
"    if(paid > 0.005) return { k:'part', label:'Partly paid' };\n"
"    return { k:'sent', label:'Sent' };\n"
"  }\n")
# the job card: no pill beside "No invoice yet", and a paid card says it once
src = bsub(src, 'script', AR,
"    var line2 = isPaid ? ('Paid in full' + (inv && inv.sent_at ? '' : ''))\n",
"    var line2 = isPaid ? 'Nothing owed on this job'   /* E: the pill already says Paid in full */\n")
src = bsub(src, 'script', AR,
"      + '<div class=\"crji-row\"><span class=\"crji-ttl\">' + title + ' ' + pill(st) + '</span></div>'\n",
"      + '<div class=\"crji-row\"><span class=\"crji-ttl\">' + title + (inv ? ' ' + pill(st) : '') + '</span></div>'   /* E: no pill beside \"No invoice yet\" */\n")
src = bsub(src, 'script', MAIN,
"#cr-inv-live .cil-pill.draft{color:#555;}\n",
"#cr-inv-live .cil-pill.draft{color:#555;}\n"
"#cr-inv-live .cil-pill.over{color:#b91c1c;}\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# I2 — "Remove this payment" stays tucked behind ⋯ (judge 5 major #2)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'style', JPS,
".crjp-card .crjp-acts2{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;color:var(--crji-ink,#f2f4f7);}\n",
".crjp-card .crjp-acts2{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;color:var(--crji-ink,#f2f4f7);}\n"
"/* E (judge 5 #2): display:flex above beat the UA's [hidden], so Remove sat open under every payment and\n"
"   the row's ⋯ toggled nothing you could see. The tray is shown only when ⋯ opens it. */\n"
".crjp-card .crjp-acts2[hidden]{display:none;}\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# I3 — taking money reads as a success (judge 5 major #3). Wording and kind only: the write is untouched.
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', AR,
"      crTell('Recorded ' + money(amt) + '. Status updated.' + (wantReceipt ? ' Sending the receipt\\u2026' : ''));\n",
"      crTell('Recorded ' + money(amt) + '. Status updated.' + (wantReceipt ? ' Sending the receipt\\u2026' : ''), 'ok');   /* E: a success is green and clears itself */\n")
src = bsub(src, 'script', AR,
"      if(went.length) crTell('Receipt for ' + money(amt) + ' ' + went.join(' and ') + (why ? ' (' + why + ')' : '') + '.');\n",
"      if(went.length) crTell('Receipt for ' + money(amt) + ' ' + went.join(' and ') + (why ? ' (' + why + ')' : '') + '.', 'ok');   /* E */\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# I4 — a Community job priced by its signed contract shows that value (judge 5 major #4)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', CC,
"var pq = priceOf(pr), amt = Number(pq.amt) || 0;\n"
"var paid = 0;\n"
"try{ if(typeof window.jobFinance === 'function') paid = Number(window.jobFinance(pr).paid) || 0; }catch(_){}\n",
"var pq = priceOf(pr), amt = Number(pq.amt) || 0, pqSrc = priceSrc(pr);\n"
"var paid = 0, _fin = null;\n"
"try{ if(typeof window.jobFinance === 'function') _fin = window.jobFinance(pr); }catch(_){}\n"
"/* E (judge 5 #4): a job priced by its SIGNED CONTRACT and nothing else (one started from an uploaded\n"
"   agreement, with no bid recorded) read Job Value $0, 0% and Balance $0 here while Invoices & AR said it\n"
"   owed $4,000. The bid ladder still answers first; when it has no number, the job's own contract (or\n"
"   accepted estimate) value is the number -- the same figure owed() gives Invoices & AR. And with no\n"
"   contract value at all, jobFinance clamps paid to $0, so a bid-priced job read every check as unpaid:\n"
"   the ledger's own total is the paid figure there, as owed() reads it. */\n"
"if(!(amt > 0) && _fin && Number(_fin.value) > 0){ amt = Number(_fin.value); pqSrc = _fin.source === 'estimate' ? 'accepted estimate' : 'signed contract'; }\n"
"if(_fin) paid = Number(_fin.value) > 0 ? (Number(_fin.paid) || 0)\n"
"  : ((typeof collPaid !== 'undefined' && collPaid) ? (Number(collPaid[pr.id]) || 0) : 0);\n")
src = bsub(src, 'script', CC,
"(priceSrc(pr) ? '<em>' + esc(priceSrc(pr)) + '</em>' : '') + '</div>' +\n",
"(pqSrc ? '<em>' + esc(pqSrc) + '</em>' : '') + '</div>' +\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# I5 — the invoice says where to send a check (judge 5 major #5). The company details are the ones the
#      estimate proposal and the agreements already print -- nothing invented.
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', MAIN,
"var INVOICE_BODY =\n"
"  '<div class=\"secthead\">INVOICE</div>' +\n"
"  '<table style=\"width:100%;border-collapse:collapse;margin:6px 0 14px;font-size:13.5px;\">' +\n"
"    '<tr><td style=\"padding:4px 0;color:#666;width:130px;\">Invoice #</td><td style=\"font-weight:800;\">[INV_NUM]</td>' +\n"
"    '<td></td><td></td></tr>' +\n"
"  '</table>' +\n",
"/* E (judge 5 polish): the invoice number moves into the Bill To table (buildEstimate's invoice branch), so\n"
"   the page no longer reads INVOICE / INVOICE with one line under the second. */\n"
"var INVOICE_BODY =\n")
src = bsub(src, 'script', MAIN,
"  '<p style=\"font-size:12.5px;color:#555;margin-top:14px;\">Please remit the balance due upon receipt. ' +\n"
"  'Checks payable to <b>Cardinal Roofing &amp; Renovations</b>. Thank you for your business!</p>';\n",
"  /* E (judge 5 #5): it said \"Checks payable to\" with no address anywhere on the page. */\n"
"  '<p style=\"font-size:12.5px;color:#555;margin-top:14px;\">Please remit the balance due upon receipt. ' +\n"
"  'Make checks payable to <b>Cardinal Roofing &amp; Renovations, LLC</b> and mail them to ' +\n"
"  '<b>5735 Webster Street, Dayton, Ohio 45414</b>. Questions about this invoice: (937) 576-6753 &middot; ' +\n"
"  'Admin@cardinalrenovations.net. Thank you for your business!</p>';\n")
src = bsub(src, 'script', MAIN,
"'accrue a late charge of 1.5% per month (18% APR) on the outstanding balance. Please contact our ' +\n"
"  'office with any questions about this invoice or to arrange payment.';\n",
"'accrue a late charge of 1.5% per month (18% APR) on the outstanding balance. Please call our office at ' +\n"
"  '(937) 576-6753 or email Admin@cardinalrenovations.net with any questions about this invoice or to arrange payment.';\n")
src = bsub(src, 'script', MAIN,
"    out = out.replace('<title>Cardinal Roofing &amp; Renovations — Estimate</title>',\n"
"                      '<title>Cardinal Roofing &amp; Renovations — Invoice</title>');\n",
"    out = out.replace('<title>Cardinal Roofing &amp; Renovations — Estimate</title>',\n"
"                      '<title>Cardinal Roofing &amp; Renovations — Invoice</title>');\n"
"    /* E (judge 5 #5): a bill carries the letterhead -- legal name, mailing address, phone, website -- the\n"
"       same line the estimate proposal prints at its foot. */\n"
"    out = out.replace('<div class=\"est-sub\">Cardinal Roofing &amp; Renovations</div>',\n"
"                      '<div class=\"est-sub\">Cardinal Roofing &amp; Renovations, LLC<br>5735 Webster Street, Dayton, Ohio 45414 &middot; ' +\n"
"                      '(937) 576-6753 &middot; www.cardinalrenovations.net</div>');\n")
src = bsub(src, 'script', MAIN,
"      '  <tr><td class=\"k\">Bill To</td><td><span class=\"ph\">[Client name]</span></td>\\n' +\n"
"      '      <td class=\"k\">Invoice Date</td><td><span class=\"ph\">[Date]</span></td></tr>\\n' +\n"
"      '  <tr><td class=\"k\">Property Address</td><td><span class=\"ph\">[Street, City, State ZIP]</span></td>\\n' +\n"
"      '      <td class=\"k\">Due</td><td>Upon receipt</td></tr>\\n' +\n"
"      '  <tr><td class=\"k\">Client Contact</td><td><span class=\"ph\">[Phone · Email]</span></td>\\n' +\n"
"      '      <td class=\"k\">Prepared By</td><td><span class=\"ph\">[Rep name &amp; title]</span></td></tr>\\n' +\n",
"      '  <tr><td class=\"k\">Bill To</td><td><span class=\"ph\">[Client name]</span></td>\\n' +\n"
"      '      <td class=\"k\">Invoice #</td><td><b>[INV_NUM]</b></td></tr>\\n' +\n"
"      '  <tr><td class=\"k\">Property Address</td><td><span class=\"ph\">[Street, City, State ZIP]</span></td>\\n' +\n"
"      '      <td class=\"k\">Invoice Date</td><td><span class=\"ph\">[Date]</span></td></tr>\\n' +\n"
"      '  <tr><td class=\"k\">Client Contact</td><td><span class=\"ph\">[Phone · Email]</span></td>\\n' +\n"
"      '      <td class=\"k\">Due</td><td>Upon receipt</td></tr>\\n' +\n"
"      '  <tr><td class=\"k\">Prepared By</td><td><span class=\"ph\">[Rep name &amp; title]</span></td>\\n' +\n"
"      '      <td class=\"k\">&nbsp;</td><td>&nbsp;</td></tr>\\n' +\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# I6 — a contract-only invoice describes the work, not the document's internal title (judge 5 minor)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', INVL,
"    if(!out.length) signed.forEach(function(r){ out.push({ d:String(r.title || 'Contract').trim(), q:1, p:ilR(r.total), x:false }); });\n",
"    /* E (judge 5): it billed one line titled \"Contract \\u2014 <client>\", the document's own title. The client\n"
"       reads the work and when it was agreed. The trade comes from the title the creator wrote (docKind). */\n"
"    if(!out.length) signed.forEach(function(r){\n"
"      var tr = ''; try{ var dk = (typeof docKind === 'function') ? docKind(r.title) : null; if(dk && dk.trade && dk.trade !== '\\u2014') tr = dk.trade; }catch(_k){}\n"
"      var sd = ''; try{ sd = r.signed_at ? new Date(r.signed_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : ''; }catch(_s){}\n"
"      out.push({ d:(tr ? tr + ' work' : 'Work') + ' per the signed agreement' + (sd ? ' dated ' + sd : ''), q:1, p:ilR(r.total), x:false });\n"
"    });\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# I7 / I8 — one red Record payment per job page; AR sub-lines keep their dollar figures (judge 5 minors)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', JPAY,
"      h += '<div class=\"crjp-foot\"><button type=\"button\" class=\"crji-btn primary\" data-arpay=\"' + E(pid) + '\">Record payment</button></div>';\n",
"      /* E (judge 5): the Invoice card right above already carries the red Record payment (Buttons A: one red) */\n"
"      h += '<div class=\"crjp-foot\"><button type=\"button\" class=\"crji-btn\" data-arpay=\"' + E(pid) + '\">Record payment</button></div>';\n")
src = bsub(src, 'style', ARS,
"#cr-ar-view .crar-addr{font-size:13px; color:var(--est-dim); margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}\n",
"/* E (judge 5): one line cut \"Paid $9,\\u2026\" -- the figure the row exists to show. It wraps now. */\n"
"#cr-ar-view .crar-addr{font-size:13px; color:var(--est-dim); margin-top:3px; white-space:normal; overflow-wrap:anywhere;}\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# I9 — the home A/R card says when the other boards owe too (judge 5 minor)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', MAIN,
"          ? 'outstanding across ' + _arRows.length + ' invoice' + (_arRows.length === 1 ? '' : 's')\n",
"          ? 'outstanding across ' + _arRows.length + ' invoice' + (_arRows.length === 1 ? '' : 's') +\n"
"            (_arElse > 0 ? ' \\u00b7 + ' + fmtMoney(_arElse) + ' on the other boards' : '')   /* E: Invoices & AR counts every board */\n")


# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# E9 — the Estimates tab: one red primary (From a template); Blank and Upload are 44px outlines (judge 2 minor)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'style', ESTS,
"#cr-est-new-btn{display:inline-block;background:#c8202e;color:#fff;border:0;padding:9px 14px;border-radius:6px;font:800 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;letter-spacing:.06em;cursor:pointer;margin-left:6px;margin-bottom:4px;font-family:inherit}#cr-est-new-btn:hover{background:#B01F21}.cr-est-saved-list{margin:12px 0 4px}",
"/* E (judge 2): three equal red blocks, one of them 34px. Blank estimate is the app's outline button now\n"
"   (.chipbtn, 44px, Buttons A); only its spacing lives here. An empty saved list draws nothing. */\n"
"#cr-est-new-btn{margin-left:6px;margin-bottom:4px}.cr-est-saved-list{margin:12px 0 4px}.cr-est-saved-list:empty{display:none}")
src = bsub(src, 'script', EST,
"btn.id = 'cr-est-new-btn';\nbtn.type = 'button';\n",
"btn.id = 'cr-est-new-btn';\nbtn.type = 'button';\nbtn.className = 'chipbtn';   /* E: an outline beside the one red From a template */\n")
src = pl.sub(src,
'<button class="btn" id="pUploadEstimateBtn" type="button" style="margin-left:8px;">Upload estimate</button>',
'<button class="chipbtn" id="pUploadEstimateBtn" type="button" style="margin-left:8px;">Upload estimate</button>')

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# E10 — the builder's own success messages are success toasts (the judge-5 toast class, found by gate_E:
#       "… added as a section." sat red and never cleared, over the phone bar's Publish)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
for old in [
  "crTell(turningOn ? '\\u201c' + (target.name || 'Assembly') + '\\u201d is now your default \\u2014 it sits at the top of the +Assembly picker.' : 'Default cleared.');",
  "crTell('“' + title.trim() + '” saved to your assemblies.');",
  "crTell('“' + (a.name || 'Assembly') + '” added as a section.');",
  "if(typeof crTell === 'function') crTell('Copied to a new draft \\u2014 edit it and Save to keep it. The original is unchanged.');",
]:
    src = bsub(src, 'script', EST, old, old[:-2] + ", 'ok');")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# E11 — the client's phone on the estimate prints as (937) 555-0177 (judge 2 polish), through the app's
#       one formatter (crValid.phone), which leaves anything it does not understand exactly as typed
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', EPUB,
"var phone      = (project && project.phone) || '';\n",
"var phone      = (project && project.phone) || '';\n"
"var prettyTel = function(t){ try{ var pv = (window.crValid && window.crValid.phone) ? window.crValid.phone(t) : null; return (pv && pv.ok && pv.pretty) ? pv.pretty : t; }catch(_pt){ return t; } };   /* E */\n"
"phone = prettyTel(phone);\n")
src = bsub(src, 'script', EPUB,
"var hoPh = String(comLead.homeowner_phone || '').trim();\n",
"var hoPh = prettyTel(String(comLead.homeowner_phone || '').trim());\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# I10 — the Commissions header's 💵 is the drawer's own drawn cash glyph (judge 5 polish; 1414's sweep)
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
PAY = '<script id="cr-pay-script">'
src = bsub(src, 'script', PAY,
"  v.innerHTML = '<div class=\"pay-head\"><h2>&#128181; Commissions</h2>' +\n",
"  v.innerHTML = '<div class=\"pay-head\"><h2>' + (typeof window.crIco === 'function' ? window.crIco('cash') + ' ' : '') + 'Commissions</h2>' +   /* E: drawn, not emoji */\n")
src = bsub(src, 'script', PAY,
"  var head = '<div class=\"pay-head\"><h2>&#128181; ' +\n",
"  var head = '<div class=\"pay-head\"><h2>' + (typeof window.crIco === 'function' ? window.crIco('cash') + ' ' : '') +   /* E */\n")

# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# I11 — one name for the money screen (judge 5 polish). The drawer and the screen's own header say
#       "Invoices & AR"; the home Money Collected tile and the home A/R card said "Invoices & Payments".
#       The screen's header cannot carry the longer name on a phone (it ellipsized "Invoices & P…"), so the
#       two home strings take the screen's name.
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
src = bsub(src, 'script', MAIN,
"data-actmoney title=\"Open Invoices &amp; Payments\">",
"data-actmoney title=\"Open Invoices &amp; AR\">")
src = bsub(src, 'script', MAIN,
"' on the others, in Invoices & Payments'",
"' on the others, in Invoices & AR'")

pl.write_atomic(OUT, src)
print('patch_E: wrote', OUT, len(ORIG), '->', len(src), 'chars')
