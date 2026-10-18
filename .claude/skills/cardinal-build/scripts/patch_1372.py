"""Build 1372 — New job for this client (Theo, 18 Oct: a finished job's client is now buying a full roof; "build it").
One project is one job — one price, one invoice, one balance, one commission — so a second sale for the same client is
a second project, not more lines on a finished one. There was no way to start one without retyping the client.
- The stage banner's ⋮ menu gets "New job for this client": it opens the existing Add project form (every rule it
  enforces stays: lead source required, PO from the database, trades, claim type) already filled with the client's
  name, address, phone and email, and Lead Source = Repeat customer.
- The new job records checklist.prior_job = the earlier job's id. Each job's ⋮ menu then offers "Open earlier job" /
  "Open newer job", so the client's history is one tap either way. Nothing is copied but contact details: no money,
  no documents, no stage, no rep."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""var pfEditing = null; /* null = adding, else project id */""",
    """var pfEditing = null; /* null = adding, else project id */
var pfFromJob = null;  /* 1372: the earlier job a "New job for this client" was started from */""")

one("""function openProjModal(pr){
  pfEditing = pr ? pr.id : null;""",
    """function openProjModal(pr){
  pfEditing = pr ? pr.id : null;
  pfFromJob = null;   /* 1372: only pfNewJobFor sets it, after this */""")

one("""      if(_clVal === 'insurance' || _clVal === 'retail') _newCk.lead = { claim_type: _clVal, retail: _clVal === 'retail' };   /* 1361 */""",
    """      if(_clVal === 'insurance' || _clVal === 'retail') _newCk.lead = { claim_type: _clVal, retail: _clVal === 'retail' };   /* 1361 */
      if(pfFromJob) _newCk.prior_job = pfFromJob;   /* 1372: the client's earlier job */
      pfFromJob = null;""")

one("""      (stg === 'Lost' || stg === 'Closed' ? '<button class="estopt" data-act="reopen">Reopen as Lead</button>' : '') +
    '</div></span>' +""",
    """      (stg === 'Lost' || stg === 'Closed' ? '<button class="estopt" data-act="reopen">Reopen as Lead</button>' : '') +
      /* 1372: a second sale for the same client is a second job */
      '<button class="estopt" data-act="newjob">New job for this client</button>' +
      (ck.prior_job && cacheProjects.some(function(x){ return x.id === ck.prior_job; }) ? '<button class="estopt" data-act="priorjob">Open earlier job</button>' : '') +
      (cacheProjects.some(function(x){ return x.id !== pr.id && parseCkAll(x).prior_job === pr.id; }) ? '<button class="estopt" data-act="laterjob">Open newer job</button>' : '') +
    '</div></span>' +""")

one("""      else if(act === 'reopen') setStage(pr.id, 'Lead').then(function(){ renderOverview(); renderPipeline(); });
      return;""",
    """      else if(act === 'reopen') setStage(pr.id, 'Lead').then(function(){ renderOverview(); renderPipeline(); });
      else if(act === 'newjob') pfNewJobFor(pr);   /* 1372 */
      else if(act === 'priorjob' && ck.prior_job) openProject(ck.prior_job);
      else if(act === 'laterjob'){
        var _nx = cacheProjects.filter(function(x){ return x.id !== pr.id && parseCkAll(x).prior_job === pr.id; })
          .sort(function(a, b){ return String(b.created_at || '').localeCompare(String(a.created_at || '')); })[0];
        if(_nx) openProject(_nx.id);
      }
      return;""")

one("""function openProjModal(pr){""",
    """/* 1372: the Add project form, started from an existing job — same client, new job. Only the contact details
   carry over; Lead Source is Repeat customer; everything else is a fresh lead. */
function pfNewJobFor(pr){
  if(!pr) return;
  openProjModal(null);
  pfFromJob = pr.id;
  document.getElementById('projModalTitle').textContent = 'New job for ' + (pr.name || 'this client');
  var put = function(id, v){ var el = /** @type {HTMLInputElement|null} */ (document.getElementById(id)); if(el) el.value = v; };
  put('pfName', pr.name || ''); put('pfAddress', pr.address || ''); put('pfPhone', pr.phone || ''); put('pfEmail', pr.email || '');
  put('pfSource', 'Repeat customer');
  try{ pfSyncSourceChips(); }catch(_s){}
}
function openProjModal(pr){""")

one(">v2026-10-18 build 1371<button", ">v2026-10-18 build 1372<button")
one("""  { b: 1371, d:'2026-10-18',""",
"""  { b: 1372, d:'2026-10-18', t:'New job for the same client', s:'When a client comes back for more work, open their job, tap ⋮ on the stage bar and choose New job for this client. The new-lead form opens with their name, address, phone and email filled in and Repeat customer picked. It becomes its own job with its own price and invoice, so the old job’s balance is never mixed with the new one. Each job’s ⋮ menu can then open the earlier or newer job.' },
  { b: 1371, d:'2026-10-18',""")
pl.write_atomic(path, s)
print('ok 1372')
