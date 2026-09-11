#!/usr/bin/env python3
"""Build 1214 - Chart.js and Papa Parse stop downloading before sign-in.

Audit item 4 from the 9 Sep external assessment. Both were `<script src>` in the
document, so every launch fetched them whether or not anyone opened a chart or a
CSV - measured signed-out in Chromium at 1440 and 390: `chart.umd.min.js` and
`papaparse.min.js` are both requested with the sign-in screen still on screen.

OPEN_ITEMS called this "regression risk on every chart consumer - its own build,
gated per consumer". MEASURED, IT IS MUCH SMALLER THAN THAT, because the app
already routes everything through one place each:

    new Chart(   -> exactly 1 site, inside rptChart(), which 7 renderers call
    Papa.parse   -> exactly 1 site, inside parseCSV(), reached only through
                    openImportModal()

THE PATTERN IS THE APP'S OWN, NOT A NEW ONE. `cr-pricing-import` already carries
`ensureXLSX()` - a memoised promise that injects the tag on first use - and
already preloads it from `openImportModal`. `ensurePapa()` is that function with
one URL changed, sitting beside it, and `ensureChart()` is the same shape for the
reports block. One mechanism per concept is the rule here.

⚠ THE GUARD THAT WOULD HAVE SHIPPED THIS BROKEN. `openImportModal()` opens with

    if (typeof Papa === 'undefined') return saveStatus('Papa Parse not loaded...')

Make the script lazy and leave that line in place and the importer refuses
itself, every time, on the first use - the feature is dead and the message blames
the user's internet. It becomes an `await ensurePapa()` instead. Adding an await
to that function is safe for the reason the invariant actually turns on: it is
already `async`, and the await sits ABOVE every side effect - nothing has been
created, shown or written when it suspends, so there is no precondition to
revalidate.

⚠ AND THE ONE IN rptChart(): it holds `el` from before the load. Re-querying
after an await is a gate law here for a reason - the reports view re-renders, and
a canvas held across the load can be a node that is no longer in the document.
The element is looked up again inside the callback.

Chart.js 4.4.3 is ~205 KB and Papa Parse ~45 KB over the wire.

Usage: patch_1214.py --src in.html --dst out.html
"""
import argparse, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

# ------------------------------------------------------------ 1. the two tags
CHART_TAG = '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>\n'
CHART_TAG_NEW = (
'<!-- 1214: Chart.js is NOT loaded here any more. It was ~205 KB fetched on every\n'
'     launch, before sign-in, for a library only the Reports screen uses. It now\n'
'     loads on the first chart, through a memoised loader that sits beside the\n'
'     one function in this file that builds a chart. (Neither name is written\n'
'     here: the patch counts that function\'s call sites, and prose naming it\n'
'     breaks the count and makes every future grep report a caller that is not\n'
'     one. It has cost this build two rounds already.) -->\n'
)

PAPA_TAG = ('<!-- Papa Parse (CSV) — eager load, ~40KB -->\n'
            '<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>\n')
PAPA_TAG_NEW = (
'<!-- 1214: Papa Parse is NOT loaded here any more — it was ~45 KB on every\n'
'     launch for a library only the pricing importer uses. ensurePapa() loads it\n'
'     when the import modal opens, next to the SheetJS preload that has always\n'
'     been there. -->\n'
)

# ------------------------------------------------------------ 2. ensureChart
RPT_OLD = 'function rptChart(id, cfg){\n'
RPT_NEW = (
'/* 1214: Chart.js loads on the FIRST CHART, not on every launch. Same shape as\n'
'   cr-pricing-import\'s SheetJS loader: one memoised promise, one injected tag,\n'
'   so\n'
'   the seven calls a report makes share a single fetch. (The identifier is left\n'
'   out of this sentence on purpose - the patch counts its call sites, and prose\n'
'   naming it both breaks that count and makes every future grep report a caller\n'
'   that is not one.) */\n'
'var _chartPromise = null;\n'
'function ensureChart(){\n'
'  if(typeof Chart !== \'undefined\') return Promise.resolve();\n'
'  if(_chartPromise) return _chartPromise;\n'
'  _chartPromise = new Promise(function(resolve, reject){\n'
'    var s = document.createElement(\'script\');\n'
'    s.src = \'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js\';\n'
'    s.onload = function(){ resolve(); };\n'
'    s.onerror = function(){ _chartPromise = null; reject(new Error(\'Chart.js failed to load\')); };\n'
'    document.head.appendChild(s);\n'
'  });\n'
'  return _chartPromise;\n'
'}\n'
'function rptChart(id, cfg){\n'
)

BODY_OLD = (
"  if(rptCharts[id]){ rptCharts[id].destroy(); }\n"
"  var el = document.getElementById(id);\n"
"  if(!el || typeof Chart === 'undefined') return;\n"
)
BODY_NEW = (
"  if(rptCharts[id]){ rptCharts[id].destroy(); delete rptCharts[id]; }\n"
"  if(!document.getElementById(id)) return;\n"
"  /* ⚠ The canvas is looked up again INSIDE the callback, never held across the\n"
"     load. The reports view re-renders, so a node captured before an await can be\n"
"     one that is no longer in the document - a gate law on this project, and the\n"
"     only thing the lazy load actually changes about this function. */\n"
"  ensureChart().then(function(){\n"
"    var el = document.getElementById(id);\n"
"    if(!el) return;\n"
"    if(rptCharts[id]){ rptCharts[id].destroy(); }\n"
)
TAIL_OLD = (
"  Chart.defaults.color = '#b9bec7';\n"
"  Chart.defaults.borderColor = 'rgba(255,255,255,.10)';\n"
"  rptCharts[id] = new Chart(el.getContext('2d'), cfg);\n"
"}\n"
)
TAIL_NEW = (
"    Chart.defaults.color = '#b9bec7';\n"
"    Chart.defaults.borderColor = 'rgba(255,255,255,.10)';\n"
"    rptCharts[id] = new Chart(el.getContext('2d'), cfg);\n"
"  }).catch(function(){\n"
"    /* offline or the CDN is down: the report's cards and numbers still render,\n"
"       the drawings do not. Silent on purpose - this used to be a `typeof Chart\n"
"       === 'undefined'` early return that said nothing either. */\n"
"  });\n"
"}\n"
)

# ------------------------------------------------------------ 3. ensurePapa
XLSX_OLD = '  // ── Lazy loader for SheetJS ──\n  let xlsxPromise = null;\n'
XLSX_NEW = (
'  // ── Lazy loader for Papa Parse (1214) ──\n'
'  // Was a plain script tag in the document, so it downloaded on every launch\n'
'  // whole app for a library only this importer uses. Deliberately the same shape\n'
'  // as the SheetJS loader directly below - the module already had the pattern.\n'
'  let papaPromise = null;\n'
'  function ensurePapa() {\n'
'    if (window.Papa) return Promise.resolve();\n'
'    if (papaPromise) return papaPromise;\n'
'    papaPromise = new Promise((resolve, reject) => {\n'
'      const s = document.createElement(\'script\');\n'
'      s.src = \'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js\';\n'
'      s.onload = () => resolve();\n'
'      s.onerror = () => { papaPromise = null; reject(new Error(\'Failed to load Papa Parse from CDN\')); };\n'
'      document.head.appendChild(s);\n'
'    });\n'
'    return papaPromise;\n'
'  }\n'
'\n'
'  // ── Lazy loader for SheetJS ──\n  let xlsxPromise = null;\n'
)

GUARD_OLD = "    if (typeof Papa === 'undefined') return saveStatus('Papa Parse not loaded — check internet', 'error');\n"
GUARD_NEW = (
'    /* 1214: this used to be a bare "is the library there yet" early return, which\n'
'       was correct while it was a plain script tag in the document and would\n'
'       have refused the importer on EVERY use once it went lazy - blaming the\n'
'       user\'s internet for a change we made. Load it here instead.\n'
'       The await is safe where the invariant actually bites: this function is\n'
'       already async and nothing has been created, shown or written yet, so there\n'
'       is no precondition to revalidate on the other side. */\n'
'    try { await ensurePapa(); }\n'
'    catch (e) { return saveStatus(\'CSV support failed to load \\u2014 check internet\', \'error\'); }\n'
)

REQ_OLD = ' REQUIRES: internet at import time (Papa Parse + SheetJS from CDN).\n'
REQ_NEW = (' REQUIRES: internet at import time (Papa Parse + SheetJS from CDN, both\n'
           ' fetched on first use since 1214 rather than on every app launch).\n')

STAMP_OLD = ">v2026-09-11 build 1213<button"
STAMP_NEW = ">v2026-09-11 build 1214<button"

CL_OLD = "var CHANGELOG = [\n"
CL_NEW = (
"var CHANGELOG = [\n"
"  { b: 1214, d: '2026-09-11', t: 'The app stops downloading two chart and spreadsheet libraries you may never open', "
"s: 'Every single launch of Cardinal was downloading two outside libraries before you had even signed in: the one "
"that draws the graphs on <b>Reports</b>, and the one that reads <b>CSV files</b> in the pricing importer. Together "
"they are about a quarter of a megabyte, and most days nobody opens either screen. They now download the moment you "
"actually open a report or an import \\u2014 so every launch is lighter, and the two screens that need them are no "
"different than before. If you are somewhere with no signal, a report will show its numbers and cards without the "
"drawings rather than failing, and the importer will say plainly that it could not load instead of blaming your "
"connection.' },\n"
)


# ── the comment-pollution guard ───────────────────────────────────────────────
# This build lost FIVE rounds to the same thing: an explanatory comment I wrote
# contained an identifier the script counts, so a correct patch failed its own
# assertion. CLAUDE.md names the class; build 732 paid for it once already; the
# fix there and here is to reword the prose, never to weaken the check. Doing it
# one failure at a time cost five runs, so the check is up front now and names
# every offender at once.
COUNTED = ["rptChart(", "ensureXLSX()", "new Chart(", "Papa.parse(",
           "typeof Papa === 'undefined'", "typeof Chart === 'undefined'",
           # ⚠ check_build counts tags, so a comment SAYING "script tag" in
           #   angle brackets is counted as an opening tag and the balance
           #   check goes red at 136 open / 134 close. That is this same
           #   class reaching past my own assertions into a standing gate.
           "<script", "</script>"]


def no_planted_identifiers():
    """⚠ Only the PROSE is checked. The first version of this guard flagged the
    real `function rptChart(id, cfg){` and the real `new Chart(...)` call — the
    code the build exists to write — which would have been a check that fails
    correct work, the very thing it was written to stop. A counted identifier is
    fine in code and only ever wrong in a comment, so only comment lines are
    scanned."""
    def comment_lines(text):
        out, in_block = [], False
        for line in text.split('\n'):
            t = line.strip()
            if in_block:
                out.append(line)
                if '*/' in t or '-->' in t: in_block = False
                continue
            if t.startswith('//') or t.startswith('*'):
                out.append(line)
            elif t.startswith('/*') or t.startswith('<!--'):
                out.append(line)
                if not ('*/' in t or '-->' in t): in_block = True
        return '\n'.join(out)

    bad = []
    for name, text in sorted(globals().items()):
        if not (name.endswith('_NEW') and isinstance(text, str)):
            continue
        prose = comment_lines(text)
        for ident in COUNTED:
            if ident in prose:
                bad.append('%s: a COMMENT line contains %r' % (name, ident))
    assert not bad, ('an explanatory comment plants an identifier this patch counts, '
                     'so a correct edit would fail its own assertion. REWORD THE PROSE, '
                     'do not weaken the check:\n  ' + '\n  '.join(bad))


def main():
    no_planted_identifiers()
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--dst', required=True)
    a = ap.parse_args()

    src = pl.load(a.src)
    orig = src

    # the surface, measured before it is changed
    assert orig.count('new Chart(') == 2, \
        'expected 2 `new Chart(` hits - the call and the comment quoting it - found %d' % orig.count('new Chart(')
    assert orig.count('Papa.parse(') == 1, 'Papa.parse is not a single site any more'
    assert orig.count('rptChart(') == 8, 'rptChart definition + 7 callers expected'

    src = pl.sub(src, CHART_TAG, CHART_TAG_NEW)
    src = pl.sub(src, PAPA_TAG, PAPA_TAG_NEW)
    src = pl.sub(src, RPT_OLD, RPT_NEW)
    src = pl.sub(src, BODY_OLD, BODY_NEW)
    src = pl.sub(src, TAIL_OLD, TAIL_NEW)
    src = pl.sub(src, XLSX_OLD, XLSX_NEW)
    src = pl.sub(src, GUARD_OLD, GUARD_NEW)
    src = pl.sub(src, REQ_OLD, REQ_NEW)
    src = pl.sub(src, STAMP_OLD, STAMP_NEW)
    src = pl.sub(src, CL_OLD, CL_NEW)

    # ---- no eager tag survives -------------------------------------------
    assert '<script src="https://cdn.jsdelivr.net/npm/chart.js' not in src, 'the eager Chart.js tag survived'
    assert '<script src="https://cdn.jsdelivr.net/npm/papaparse' not in src, 'the eager Papa tag survived'
    # supabase-js stays eager on purpose - the app cannot boot without it
    assert src.count('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>') == 1

    # ---- exactly one loader each, and the URLs moved into them -----------
    assert src.count('function ensureChart(){') == 1
    assert src.count('function ensurePapa() {') == 1
    assert src.count('chart.js@4.4.3/dist/chart.umd.min.js') == \
           orig.count('chart.js@4.4.3/dist/chart.umd.min.js'), 'the Chart.js URL was lost or duplicated'
    assert src.count('papaparse@5.4.1/papaparse.min.js') == \
           orig.count('papaparse@5.4.1/papaparse.min.js'), 'the Papa URL was lost or duplicated'

    # ---- the guard that would have killed the importer is gone ----------
    assert "typeof Papa === 'undefined'" not in src, 'the refuse-on-first-use guard survived'
    assert src.count('await ensurePapa();') == 1

    # ---- the canvas is re-queried inside the callback, not held ---------
    i = src.index('function rptChart(id, cfg){')
    j = src.index('\nfunction rptRepName(', i)
    fn = src[i:j]
    print('  rptChart captured: %d chars' % len(fn))
    assert 'ensureChart().then(function(){' in fn
    assert fn.count("var el = document.getElementById(id);") == 1, \
        'the canvas must be looked up exactly once, INSIDE the callback'
    assert fn.index('ensureChart().then') < fn.index("var el = document.getElementById(id);"), \
        'the lookup is before the load - that is the stale-node trap this build exists to avoid'
    assert 'new Chart(el.getContext' in fn

    # ---- every caller is untouched --------------------------------------
    assert orig.count('rptChart(') == src.count('rptChart('), 'a caller moved'
    for chart in ("rptChart('chRevenue'", "rptChart('chFunnel'", "rptChart('chLeads'",
                  "rptChart('chSource'", "rptChart('chLoss'", "rptChart('chRepRev'",
                  "rptChart('chProd'"):
        assert src.count(chart) == 1, 'a report chart moved: ' + chart
    # ...and so is the XLSX loader this copied
    assert src.count('function ensureXLSX() {') == orig.count('function ensureXLSX() {') == 1
    assert src.count('ensureXLSX()') == orig.count('ensureXLSX()')

    assert orig.count('build 1213') - src.count('build 1213') == 1
    assert src.count('{ b: 1214,') == 1
    assert src.count('{ b: 1213,') == orig.count('{ b: 1213,') == 1

    pl.write_atomic(a.dst, src)
    pl.assert_in(a.dst, 'function ensureChart(){')
    pl.assert_in(a.dst, 'await ensurePapa();')
    print('index.html %+d chars - 2 eager CDN tags removed, 2 memoised loaders added'
          % (len(src) - len(orig)))


if __name__ == '__main__':
    main()
