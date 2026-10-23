"""Build 1401 — an office day on insurance, Community and money (23 Oct 2026 audit, round 5).
1. The claim screens read only insurance_payments (0 rows in production); every real check is a job payment
   (collections). The claim strip, claim list, claim detail, the claim card on linked records and the hub
   tile said "Received $0" on jobs the job page called paid in full. They now add the job's payments.
   The strip's "ACV Paid" showed the approved ACV, not money paid — it is labelled "ACV".
2. "Deductibles due" (Claims hub) and Owner Review's "Deductible not collected" ignored homeowner payments
   recorded with Record payment. Both now count them.
3. "Owed by carriers" treated the deductible as the carrier's money: the carrier's first check is ACV less
   the deductible (the Library's own wording), so the deductible no longer reads as carrier debt.
4. The carrier chase list showed the full depreciation + supplement on Invoiced jobs whatever the carrier
   had paid; it now uses the same carrierLeft() and drops a job the carrier has finished paying.
5. Money In & Commissions on an insurance job used the dark-theme inks on the claim page's ground
   (1.06:1). The tab takes the claim page's own ink pair there.
6. Invoices & AR's text and email said "Hi <occupant>" on a Community invoice; they use invHello() as the
   job page's invoice card does since 1376.
7. Community Partners: "Owed" was the whole estimate on an Invoiced job whatever had been paid, and the
   list sorted by it so Habitat could drop below a smaller partner. Owed is now the A/R balance and Habitat
   sorts first, as on the Partner A/R card."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1a — the shared helper, defined in cr-claims-script
one("""  async function loadClaim(id) {
    const [claimRes, paysRes, supsRes] = await Promise.all([""",
"""  /* 1401: money received on a claim's JOB. Every real check is recorded with Record payment (collections);
     insurance_payments held no rows in production, so the claim screens read $0 on paid jobs. */
  window.crJobMoneyIn = async function(pids){
    var out = {};
    pids = (pids || []).filter(Boolean);
    if (!pids.length || !window.supa) return out;
    try {
      var r = await window.supa.from('collections').select('project_id,amount').in('project_id', pids);
      (r && r.data || []).forEach(function(k){ out[k.project_id] = (out[k.project_id] || 0) + (Number(k.amount) || 0); });
    } catch (e) {}
    return out;
  };

  async function loadClaim(id) {
    const [claimRes, paysRes, supsRes] = await Promise.all([""")
# 1b — claim list
one("""      (pays || []).forEach(p => { byClaim[p.claim_id] = (byClaim[p.claim_id] || 0) + Number(p.amount); });
      data.forEach(async c => c._paid = byClaim[c.id] || 0);""",
"""      (pays || []).forEach(p => { byClaim[p.claim_id] = (byClaim[p.claim_id] || 0) + Number(p.amount); });
      const jobIn = await window.crJobMoneyIn(data.map(c => c.project_id));   /* 1401 */
      data.forEach(c => { c._paid = (byClaim[c.id] || 0) + (jobIn[c.project_id] || 0); });""")
# 1c — claim detail
one("""    state.payments = paysRes.data || [];
    state.supplements = supsRes.data || [];""",
"""    state.payments = paysRes.data || [];
    state.supplements = supsRes.data || [];
    state.jobIn = (await window.crJobMoneyIn([state.claim.project_id]))[state.claim.project_id] || 0;   /* 1401 */""")
one("""    var received = pays.reduce(function(s, p){ return s + (Number(p.amount) || 0); }, 0);
    var approvedSupp""",
"""    var received = pays.reduce(function(s, p){ return s + (Number(p.amount) || 0); }, 0) + (Number(c._jobIn) || 0);   /* 1401: + the job's payments */
    var approvedSupp""")
one("""    const _cm = claimMoney(c, state.payments, state.supplements);""",
"""    const _cm = claimMoney(Object.assign({}, c, { _jobIn: state.jobIn }), state.payments, state.supplements);""")
one("""  function renderPayments() {
    if (!state.payments.length) {
      return `<div class="cr-c-empty">No payments logged yet.<small>Tap "+ Add Payment" when a check comes in.</small></div>`;
    }""",
"""  function renderPayments() {
    /* 1401: checks recorded on the job (Record payment) count toward this claim too */
    const jobLine = state.jobIn > 0
      ? `<div class="cr-c-empty">Recorded on the job: <b>$${fmt(state.jobIn)}</b><small>Payments from the job's Record payment count toward this claim.</small></div>` : '';
    if (!state.payments.length) {
      return jobLine || `<div class="cr-c-empty">No payments logged yet.<small>Record checks on the job with Record payment.</small></div>`;
    }""")
one("""          <tr class="total"><td colspan="3">Total Received</td><td class="amt">$${fmt(total)}</td></tr>
        </tbody>
      </table></div>
    `;""",
"""          <tr class="total"><td colspan="3">Total Received</td><td class="amt">$${fmt(total)}</td></tr>
        </tbody>
      </table></div>
    ` + jobLine;""")
# 1d — linked-record claim card (cr-xlinks)
one("""      .select('id, carrier, claim_number, homeowner_name, property_address, status, approved_rcv')
      .eq('id', claimId)""",
"""      .select('id, project_id, carrier, claim_number, homeowner_name, property_address, status, approved_rcv')
      .eq('id', claimId)""")
one("""    const paid = (pays || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const rcv = Number(claim.approved_rcv || 0);""",
"""    const _xin = window.crJobMoneyIn ? (await window.crJobMoneyIn([claim.project_id]))[claim.project_id] || 0 : 0;   /* 1401 */
    const paid = (pays || []).reduce((s, p) => s + Number(p.amount || 0), 0) + _xin;
    const rcv = Number(claim.approved_rcv || 0);""")
# 1e — hub tile
one("""        .select('id, status, approved_rcv')
        .limit(500);
      if (res.error) throw res.error;
      var rows = res.data || [];

      var pay = await window.supa.from('insurance_payments').select('amount').limit(2000);
      var received = (pay.data || []).reduce(function(s,p){ return s + Number(p.amount||0); }, 0);""",
"""        .select('id, project_id, status, approved_rcv')
        .limit(500);
      if (res.error) throw res.error;
      var rows = res.data || [];

      var pay = await window.supa.from('insurance_payments').select('amount').limit(2000);
      var received = (pay.data || []).reduce(function(s,p){ return s + Number(p.amount||0); }, 0);
      if (window.crJobMoneyIn) {   /* 1401: + what the claims' jobs were paid */
        var _hin = await window.crJobMoneyIn(rows.map(function(r){ return r.project_id; }));
        Object.keys(_hin).forEach(function(k){ received += _hin[k]; });
      }""")
# 1f — insstage strip
one("""      var pr2 = await window.supa.from('insurance_payments').select('amount').eq('claim_id', claim.id);
      paid = (pr2.data || []).reduce(function(s,p){ return s + Number(p.amount || 0); }, 0);
    }catch(e){}""",
"""      var pr2 = await window.supa.from('insurance_payments').select('amount').eq('claim_id', claim.id);
      paid = (pr2.data || []).reduce(function(s,p){ return s + Number(p.amount || 0); }, 0);
      if(window.crJobMoneyIn) paid += (await window.crJobMoneyIn([pid]))[pid] || 0;   /* 1401: the job's own payments */
    }catch(e){}""")
one("""        '<div class="cell"><div class="k">ACV Paid</div><div class="v">' + money(acv) + '</div></div>' +""",
"""        '<div class="cell"><div class="k">ACV</div><div class="v">' + money(acv) + '</div></div>' +""")

# 2a + 3 — Claims hub: deductible owed by the carrier, homeowner payments count toward the deductible
one("""var carrierPaidBy = null;
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
var past = Math.max(0, paid - acv);""",
"""var carrierPaidBy = null, homePaidBy = null;
function paidMaps(){
if(carrierPaidBy) return;
carrierPaidBy = {}; homePaidBy = {};
(window.cacheCollections || []).forEach(function(k){
var src = String(k.source || '').toLowerCase();
if(!k.project_id) return;
if(src === 'insurance') carrierPaidBy[k.project_id] = (carrierPaidBy[k.project_id] || 0) + (Number(k.amount) || 0);
if(src === 'homeowner') homePaidBy[k.project_id] = (homePaidBy[k.project_id] || 0) + (Number(k.amount) || 0);   /* 1401 */
});
}
function carrierLeft(pr, c){
paidMaps();
var paid = carrierPaidBy[pr.id] || 0;
var acv = Number(c.approved_acv) || 0, dep = Number(c.approved_depreciation) || 0, sup = Number(c.supplement_approved) || 0;
/* 1401: the carrier's first check is the ACV LESS the deductible — the homeowner pays that part, waived or not */
var ded = Number(c.deductible) || 0;
var past = Math.max(0, paid - Math.max(0, acv - ded));""")
one("""carrierPaidBy = null;   /* 1379: the payment cache may have changed since the last paint */""",
"""carrierPaidBy = null; homePaidBy = null;   /* 1379: the payment cache may have changed since the last paint */""")
one("""if(st !== 'Closed' && !c.deductible_waived && Number(c.deductible) > 0){   /* 1338 (audit R8): Closed is settled */
dedDue += Number(c.deductible); dedCount++;
}""",
"""if(st !== 'Closed' && !c.deductible_waived && Number(c.deductible) > 0){   /* 1338 (audit R8): Closed is settled */
paidMaps();   /* 1401: what the homeowner has paid counts toward it */
var _dl = Math.max(0, Number(c.deductible) - (homePaidBy[pr.id] || 0));
if(_dl > 0){ dedDue += _dl; dedCount++; }
}""")
# 4 — chase list
one("""if(st === 'Invoiced'){
out.push({ pr:pr, carrier:c.carrier || 'carrier not recorded',
why:'awaiting release',
days:daysSince(ck2.stage_since || pr.updated_at),
claimId:c.id || null, chasedAt:c.last_chased_at || null,
chasedBy:c.last_chased_by || null,
amt:(Number(c.approved_depreciation) || 0) +
(Number(c.supplement_approved) || 0) });
}""",
"""var _cl = st === 'Invoiced' ? carrierLeft(pr, c) : null;   /* 1401: what is LEFT, as the hub counts it */
if(_cl && _cl.dep + _cl.sup > 0){
out.push({ pr:pr, carrier:c.carrier || 'carrier not recorded',
why:'awaiting release',
days:daysSince(ck2.stage_since || pr.updated_at),
claimId:c.id || null, chasedAt:c.last_chased_at || null,
chasedBy:c.last_chased_by || null,
amt:_cl.dep + _cl.sup });
}""")

# 2b — Owner Review
one("""    try{ var d = await c.from('insurance_payments').select('claim_id,kind,amount'); ipay = (d && d.data) || []; }catch(e){}""",
"""    try{ var d = await c.from('insurance_payments').select('claim_id,kind,amount'); ipay = (d && d.data) || []; }catch(e){}
    var homeIn = {};   /* 1401: a deductible paid through Record payment (Homeowner) is collected */
    try{ var dc = await c.from('collections').select('project_id,amount,source').eq('source', 'homeowner');
      ((dc && dc.data) || []).forEach(function(k){ if(k.project_id) homeIn[k.project_id] = (homeIn[k.project_id] || 0) + (Number(k.amount) || 0); }); }catch(e){}""")
one("""        else if(Number(fin.balance) > 0 && (dedPaid[cl.id] || 0) < ded) orvHit""",
"""        else if(Number(fin.balance) > 0 && (dedPaid[cl.id] || 0) + (homeIn[pr.id] || 0) < ded) orvHit""")

# 5 — Money In & Commissions on the claim page's ground
one("""#tab-commissions .empty b{color:var(--rbe-head,#ffffff);}
</style>""",
"""#tab-commissions .empty b{color:var(--rbe-head,#ffffff);}
/* 1401: an insurance job paints the claim page's ground, so the tab takes that page's ink pair */
body.claim-insurance #tab-commissions{--cr-stack:"1401 insurance ground";
  --rbe-ink:var(--ct-ink,#17181B);--rbe-head:var(--ct-ink,#17181B);--rbe-mute:var(--ct-ink-2,#6E6663);
  --rbe-panel2:var(--ct-surface,#FFFFFF);--rbe-line:var(--ct-line,#EAE5E3);--rbe-empty-bd:var(--ct-line-strong,#DED8D6);
  --btn-ink:var(--ct-ink,#17181B);}
</style>""")

# 6 — Invoices & AR greeting
one("""        var body = 'Hi ' + firstName(prT) + ', here’s your invoice""",
"""        var body = invHello(prT) + ', here’s your invoice""")
one("""        var body = 'Hi ' + firstName(prE) + ',\\n\\nHere is your invoice""",
"""        var body = invHello(prE) + ',\\n\\nHere is your invoice""")

# 7 — Partners pane
one("""function partners(){
var byName = {};
projects().forEach(function(pr){""",
"""function partners(){
var byName = {};
var arBal = {};   /* 1401: owed = the A/R balance (payments count), the same number the Partner A/R card shows */
try{ ((window.CardinalAR && typeof window.CardinalAR.list === 'function') ? window.CardinalAR.list() : []).forEach(function(x){
if(x && x.pr) arBal[x.pr.id] = Number(x.fin && x.fin.balance) || 0; }); }catch(_){}
projects().forEach(function(pr){""")
one("""p.awarded += amt; p.owed += amt;
p.jobs.push({ pr:pr, tag:'invoiced', amt:amt, d:null });""",
"""var _ow = Object.prototype.hasOwnProperty.call(arBal, pr.id) ? arBal[pr.id] : amt;
p.awarded += amt; p.owed += _ow;
p.jobs.push({ pr:pr, tag:'invoiced', amt:_ow, d:null });""")
one("""list.sort(function(a,b){ return b.owed - a.owed || b.out - a.out; });
return list;""",
"""list.sort(function(a,b){
var ha = /habitat/i.test(a.name), hb = /habitat/i.test(b.name);   /* 1401: Habitat sorts first in every partner list */
if(ha !== hb) return ha ? -1 : 1;
return b.owed - a.owed || b.out - a.out; });
return list;""")

one(">v2026-10-23 build 1400<", ">v2026-10-23 build 1401<")
one("""  { b: 1400, d:'2026-10-23',""",
"""  { b: 1401, d:'2026-10-23', t:'Insurance and partner money adds up', s:'The claim card, claim list and claim page now count the checks you record on the job with Record payment, so a paid claim no longer reads $0 received. Deductibles due and Owner Review count a deductible the homeowner paid. Owed by carriers no longer counts the deductible as the carrier\\u2019s money, and the carrier chase list shows what is actually left. Money In & Commissions is readable on insurance jobs. Invoices & AR greets the partner, not the occupant, on a Community invoice. Community Partners shows what each partner still owes after payments, with Habitat first.' },
  { b: 1400, d:'2026-10-23',""")
pl.write_atomic(path, s)
print('ok 1401')
