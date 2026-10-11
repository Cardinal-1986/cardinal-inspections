"""Build 1311 — Community clean-up, part 2: Estimates and Clients stop repeating the home
(Theo: "All" — items D and E).

D  Estimates (pane 'bids') drops the money tiles (KPI975), "Due soon", the Partners fold
   and the "Waiting on you" fold. The 1303/1304 home shows every one of them: pipeline
   counts and dollars, "Overdue and due soon", the same chase/sched/inv queues per job,
   and the Partners door. What stays is the All estimates table, the screen every home
   door lands on — now open by default, because it is the whole pane. The sales rep's
   "your bids only" line stays.
   ⚠ The Waitlist tile (977) was a door too. The home does not show it, so the count is
   reachable through the filter's Waitlist facet (CH_GROUPS, unchanged).
E  Clients drops "By stage" — the pipeline again. "By partner" stays.
The 'kpi:' and 'q:' doors and their wiring go with the markup that used them. No data
changes; only what these two screens draw.

Usage: python3 patch_1311.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

START = "/* ---- KPI strip (presentation-gated exactly as before) ---- */\n"
END = "var weekBody = (queue('Chase a decision', d.chase, 'Prospect') +\nqueue('Get on the calendar', d.sched, 'Approved') +\nqueue('Invoice the partner', d.inv, 'Completed')) ||\n'<div class=\"cc-empty\">Nothing waiting on you.</div>';\n"
assert src.count(START) == 1 and src.count(END) == 1
i = src.index(START); j = src.index(END) + len(END)
assert i < j and j - i < 9000, (i, j)
src = src[:i] + """/* 1311 (Theo, "All"): the money tiles, Due soon, the Partners fold and the Waiting on
   you fold left Estimates — the 1303/1304 home shows all four. The Waitlist count is
   still a filter facet (CH_GROUPS). */
doors = {};
var mine1311 = (role === 'sales') ? '<div class="cc-mine">Your pipeline \\u2014 your bids only</div>' : '';
""" + src[j:]

A = """var bidsPane = '<div data-pane="bids" class="' + (pane === 'bids' ? 'on' : '') + '">' +
kpi +
fold('due', 'Due soon', d.due.length, dueBody) +
'<div class="cc-g2">' +
fold('partners', 'Partners', ps.length, partnersBody) +
fold('week', 'Waiting on you', null, weekBody) +
'</div>' +
fold('allbids', 'All estimates', d.all.length, allBidsBody, false) +"""
B = """var bidsPane = '<div data-pane="bids" class="' + (pane === 'bids' ? 'on' : '') + '">' +
mine1311 +
fold('allbids', 'All estimates', d.all.length, allBidsBody) +   /* 1311: the whole pane now, so open */"""
src = pl.sub(src, A, B)

# E: By stage
A = """var byPartner = {}, byStage = {};"""
B = """var byPartner = {};   /* 1311: By stage left Clients (the pipeline shows it) */"""
src = pl.sub(src, A, B)
A = """byPartner[pn] = (byPartner[pn] || 0) + 1;
var st = LABEL[normStage(pr.stage)] || normStage(pr.stage);
byStage[st] = (byStage[st] || 0) + 1;
});"""
B = """byPartner[pn] = (byPartner[pn] || 0) + 1;
});"""
src = pl.sub(src, A, B)
A = """'<div class="cc-g2">' +
fold('bypartner', 'By partner', Object.keys(byPartner).length, tally(byPartner, true, 'partner')) +
fold('bystage', 'By stage', Object.keys(byStage).length, tally(byStage, false, 'stage')) +
'</div></div>';"""
B = """fold('bypartner', 'By partner', Object.keys(byPartner).length, tally(byPartner, true, 'partner')) +
'</div>';"""
src = pl.sub(src, A, B)

# the wiring for the doors that no longer render
A = """host.querySelectorAll('[data-cckpi]').forEach(function(el){
el.onclick = function(){ applyDoor(doors['kpi:' + el.getAttribute('data-cckpi')]); };
});
host.querySelectorAll('[data-queue]').forEach(function(el){
el.onclick = function(){ applyDoor(doors['q:' + el.getAttribute('data-queue')]); };
});"""
B = """/* 1311: the [data-cckpi] tiles and [data-queue] rows left with the Estimates folds. */"""
src = pl.sub(src, A, B)

A = ">v2026-10-11 build 1310<button"; B = ">v2026-10-11 build 1311<button"; src = pl.sub(src, A, B)
A = "var CHANGELOG = [\n"
B = """var CHANGELOG = [
  { b: 1311, d: '2026-10-11', t: 'Community Estimates and Clients stop repeating the home',
    s: 'The Community home already shows the pipeline money, what is due soon, what is waiting on you and the partners, so the Estimates screen no longer repeats them: it opens straight on the full list of estimates, with its filter and sort. The Clients screen drops its By stage count for the same reason; By partner stays. The waitlist is still one tap away in the filter.' },
"""
src = pl.sub(src, A, B)
pl.write_atomic(PATH, src)
print('patched', PATH)
