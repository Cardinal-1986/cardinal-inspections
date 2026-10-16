"""Build 1361 — the client form can move a job from Retail to Insurance (and back).
Theo, with a screenshot of the Edit client info form showing Work type "Insurance (legacy — set Claim Type
instead)": "Once a customer is put in as retail, changing the work type doesn't move them from retail to
insurance category when selected and still shows as retail rather than in the insurance tab."
Measured: which tab a job lives in is checklist.lead.claim_type (projClaimType). Work type never touched it;
cr-wtd strips Insurance/Retail from that list on purpose and labels a leftover one "set Claim Type instead" —
but the form has no Claim Type, and the only button that changes it (#dbConvertIns) is hidden behind the
Admin row on retail, so a rep had no way to do it at all.
- The form gets a Claim type row: Retail | Insurance (the same pf-chip look as Lead source). It opens on the
  job's claim type; a job with no claim type but a legacy Insurance/Retail work type opens on that one.
- Picking the legacy Insurance/Retail work type moves the chip with it.
- Save calls changeClaimType() — the Convert button's own path: going to Insurance asks for the carrier and
  claim details exactly as Convert does; leaving Insurance still warns before it deletes the claim data.
- A Community job shows "Community job" instead of the chips: that type is set by the community bid and
  carries partner billing, so it is not switched from here.
- A new lead can be started as Insurance or Retail."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""    <label>Job category<select id="pfCategory">""",
"""    <label>Claim type</label>
    <input type="hidden" id="pfClaim">
    <div class="pf-chips" id="pfClaimChips"><button type="button" class="pf-chip" data-claim="retail">Retail</button><button type="button" class="pf-chip" data-claim="insurance">Insurance</button></div>
    <div id="pfClaimNote" style="display:none;margin:6px 0 12px;font-size:13px;">Community job — set by the community bid, so it is changed from the community page.</div>
    <label>Job category<select id="pfCategory">""")

one("""  })((/** @type {HTMLSelectElement} */ (document.getElementById('pfWorkType'))), _ck.work_type || '');""",
"""  })((/** @type {HTMLSelectElement} */ (document.getElementById('pfWorkType'))), _ck.work_type || '');
  /* 1361: the claim type is what decides the Retail / Insurance tab. A job with none set but a legacy
     Insurance/Retail work type opens on that one, so saving finally moves it. */
  (function(){
    var ct = pr ? projClaimType(pr) : '';
    if(ct === 'unknown' || !ct){ var lw = String(_ck.work_type || '').toLowerCase(); ct = (lw === 'insurance' || lw === 'retail') ? lw : ''; }
    var hid = document.getElementById('pfClaim'), chips = document.getElementById('pfClaimChips'), note = document.getElementById('pfClaimNote');
    if(hid instanceof HTMLInputElement) hid.value = ct;
    if(chips) chips.style.display = (ct === 'community') ? 'none' : '';
    if(note) note.style.display = (ct === 'community') ? '' : 'none';
    pfSyncClaimChips();
  })();""")

one("""function pfSyncSourceChips(){""",
"""/* 1361: the Claim type chips on the client form */
function pfSyncClaimChips(){
  var host = document.getElementById('pfClaimChips'), hid = document.getElementById('pfClaim');
  if(!host || !(hid instanceof HTMLInputElement)) return;
  var cur = hid.value;
  host.querySelectorAll('.pf-chip').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-claim') === cur); });
}
(function(){
  var host = document.getElementById('pfClaimChips');
  if(host) host.addEventListener('click', function(e){
    var b = e.target instanceof Element ? e.target.closest('.pf-chip') : null; if(!b) return;
    var hid = document.getElementById('pfClaim');
    if(hid instanceof HTMLInputElement) hid.value = b.getAttribute('data-claim') || '';
    pfSyncClaimChips();
  });
  /* picking the legacy Insurance / Retail work type moves the claim type with it */
  var wt = document.getElementById('pfWorkType');
  if(wt) wt.addEventListener('change', function(ev){
    var tg = ev.target;
    var v = (tg instanceof HTMLSelectElement) ? String(tg.value || '').toLowerCase() : '';
    var hid = document.getElementById('pfClaim');
    if((v === 'insurance' || v === 'retail') && hid instanceof HTMLInputElement && hid.value !== 'community'){ hid.value = v; pfSyncClaimChips(); }
  });
})();
function pfSyncSourceChips(){""")

one("""    if(pfEditing){
      await pdb.update(pfEditing, fields);
      var _epr = cacheProjects.find(function(x){ return x.id === pfEditing; });
      if(_epr) await patchProjectCk(_epr, { lead_source: _srcVal, job_cost: _jcVal, job_category: _catVal, work_type: _wtVal, trades: _trVal, trade: null });
      projModal.style.display = 'none';
      await reload();
      if(currentProject && currentProject.id === pfEditing) openProject(pfEditing);""",
"""    var _clEl = document.getElementById('pfClaim');
    var _clVal = (_clEl instanceof HTMLInputElement) ? _clEl.value : '';   /* 1361 */
    if(pfEditing){
      var _edId = pfEditing;
      await pdb.update(pfEditing, fields);
      var _epr = cacheProjects.find(function(x){ return x.id === pfEditing; });
      var _clWas = _epr ? projClaimType(_epr) : '';
      if(_epr) await patchProjectCk(_epr, { lead_source: _srcVal, job_cost: _jcVal, job_category: _catVal, work_type: _wtVal, trades: _trVal, trade: null });
      projModal.style.display = 'none';
      await reload();
      /* 1361: move it to the tab it now belongs to, through the Convert button's own path */
      if(_clVal && _clVal !== 'community' && _clVal !== _clWas){
        var _fr = cacheProjects.find(function(x){ return x.id === _edId; });
        if(_fr) await changeClaimType(_fr, _clVal);
      }
      if(currentProject && currentProject.id === _edId) openProject(_edId);""")

one("""      fields.checklist = JSON.stringify({ po: nextPo(), stage_since: new Date().toISOString(),
        t_Lead: new Date().toISOString(), lead_source: _srcVal, job_cost: _jcVal,
        job_category: _catVal, work_type: _wtVal, trades: _trVal });""",
"""      var _newCk = { po: nextPo(), stage_since: new Date().toISOString(),
        t_Lead: new Date().toISOString(), lead_source: _srcVal, job_cost: _jcVal,
        job_category: _catVal, work_type: _wtVal, trades: _trVal };
      if(_clVal === 'insurance' || _clVal === 'retail') _newCk.lead = { claim_type: _clVal, retail: _clVal === 'retail' };   /* 1361 */
      fields.checklist = JSON.stringify(_newCk);""")

one(">v2026-10-16 build 1360<button", ">v2026-10-16 build 1361<button")
one("""  { b: 1360, d:'2026-10-16',""",
"""  { b: 1361, d:'2026-10-16', t:'Move a client to Insurance from Edit client info', s:'The Edit client info form now has a Claim type: Retail or Insurance. That is what decides which tab a client lives in. Changing the work type never moved anyone, which is why a client set to the old Insurance work type stayed under Retail. Pick Insurance and save, fill in the carrier and claim details it asks for, and the client moves to the Insurance tab. Picking the old Insurance work type now selects Insurance for you. A new lead can be started as Insurance too.' },
  { b: 1360, d:'2026-10-16',""")
pl.write_atomic(path, s)
print('ok 1361')
