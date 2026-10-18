"""Build 1367 — invoicing audit D6 + D11.
D6  "Invoice #… is ready" was crTell's default kind, 'err': a red toast that waits to be dismissed, for a success.
    It is now 'ok' (green, clears itself). The other D6 halves were already fixed: the Worksheet wording at 1318,
    and the editor's Text to sign reads "Text pay link" on an invoice since 1313.
D11 Community's Partner A/R tile (and every pipeline bucket) lands on the bids table titled "All estimates" while
    it shows a filtered list. The title now follows the filter when only a stage is set — "Invoiced jobs" — with
    the shown count; any other filter, or none, keeps "All estimates"."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""    crTell('Invoice ' + num + ' is ready. Send it from the job\\u2019s invoice card or the editor \\u2014 the job moves to Invoiced when it goes out.');   /* 1318 */""",
    """    crTell('Invoice ' + num + ' is ready. Send it from the job\\u2019s invoice card or the editor \\u2014 the job moves to Invoiced when it goes out.', 'ok');   /* 1318; 1367: a success, so the green kind */""")

one("""fold('allbids', 'All estimates', d.all.length, allBidsBody) +   /* 1311: the whole pane now, so open */""",
    """fold('allbids', bidsTitle1367() || 'All estimates', bidsTitle1367() ? chRows.length : d.all.length, allBidsBody) +   /* 1311: the whole pane now, so open; 1367: titled by its filter */""")

one("""var chRows = chSorted(d.all.filter(chMatches));""",
    """var chRows = chSorted(d.all.filter(chMatches));
/* 1367: a door that filters by stage (Partner A/R, the pipeline buckets) lands on a table that says what it holds */
function bidsTitle1367(){
var sets = chState.sets || {};
var keys = Object.keys(sets).filter(function(k){ return (sets[k] || []).length; });
if(keys.length === 1 && keys[0] === 'stage') return esc(sets.stage.join(' \\u00b7 ')) + ' jobs';
return '';
}""")

one(">v2026-10-18 build 1366<button", ">v2026-10-18 build 1367<button")
one("""  { b: 1366, d:'2026-10-18',""",
"""  { b: 1367, d:'2026-10-18', t:'Two invoice messages say the right thing', s:'Making an invoice now shows a green message that clears itself, instead of a red one that looked like something went wrong. On Community, tapping Partner A/R or a pipeline bucket opens the list titled by what it shows, such as Invoiced jobs, with that count, instead of All estimates.' },
  { b: 1366, d:'2026-10-18',""")
pl.write_atomic(path, s)
print('ok 1367')
