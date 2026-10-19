"""Build 1379 — the Claims hub's "owed" counts the carrier's checks already in (audit R8b).
On an insurance job at Invoiced, the hub said the carrier owed the whole approved depreciation plus the approved
supplement, however much the carrier had already paid. 1338 left this open: the hub did not load payments and there
was no way to tell carrier money from the homeowner's. Since 1378 the payment cache carries collections.source.
The rule: a job's carrier money (source 'insurance') pays down the ACV first, then the depreciation, then the
approved supplement; the hub's Depreciation and Supplement figures (and the Invoiced rail tile) show what is LEFT.
A job with no carrier payments recorded reads exactly as before. Nothing is written."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""function compute(){
var projects = insuranceProjects();
var byKey = {};""",
"""/* 1379 (audit R8b): what the carrier still owes on a job. Its recorded checks (collections.source 'insurance',
   in the app's payment cache since 1378) pay the ACV first, then the depreciation, then the approved supplement. */
var carrierPaidBy = null;
function carrierLeft(pr, c){
if(!carrierPaidBy){
carrierPaidBy = {};
(window.cacheCollections || []).forEach(function(k){
if(String(k.source || '').toLowerCase() !== 'insurance' || !k.project_id) return;
carrierPaidBy[k.project_id] = (carrierPaidBy[k.project_id] || 0) + (Number(k.amount) || 0);
});
}
var paid = carrierPaidBy[pr.id] || 0;
var acv = Number(c.approved_acv) || 0, dep = Number(c.approved_depreciation) || 0, sup = Number(c.supplement_approved) || 0;
var past = Math.max(0, paid - acv);
var depLeft = Math.max(0, dep - past);
var supLeft = Math.max(0, sup - Math.max(0, past - dep));
return { dep: depLeft, sup: supLeft };
}
function compute(){
carrierPaidBy = null;   /* 1379: the payment cache may have changed since the last paint */
var projects = insuranceProjects();
var byKey = {};""")

one("""else if(st === 'Invoiced')    amt = (Number(c.approved_depreciation) || 0) +
(Number(c.supplement_approved) || 0);""",
"""else if(st === 'Invoiced'){   /* 1379: what is left, not what was approved */
var _lf = carrierLeft(pr, c); amt = _lf.dep + _lf.sup; }""")
one("""if(st === 'Invoiced'){
owedDep  += Number(c.approved_depreciation) || 0;
owedSupp += Number(c.supplement_approved) || 0;
}""",
"""if(st === 'Invoiced'){
var _lf2 = carrierLeft(pr, c);   /* 1379 (R8b) */
owedDep  += _lf2.dep;
owedSupp += _lf2.sup;
}""")

one(">v2026-10-19 build 1378<button", ">v2026-10-19 build 1379<button")
one("""  { b: 1378, d:'2026-10-19',""",
"""  { b: 1379, d:'2026-10-19', t:'Owed by the insurance company counts their checks', s:'On the Claims hub, what the insurance company still owes on an invoiced job now takes off the checks they have already sent. Their money pays the first (ACV) check, then the depreciation, then any approved supplement, and the Depreciation and Supplement figures show what is left. A job with no insurance checks recorded reads the same as before.' },
  { b: 1378, d:'2026-10-19',""")
pl.write_atomic(path, s)
print('ok 1379')
