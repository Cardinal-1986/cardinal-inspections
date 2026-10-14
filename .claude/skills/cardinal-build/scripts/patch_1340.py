"""Build 1340 — Theo, 14 Oct: "2 (1)" — a homeowner's signature on an estimate counts as ACCEPTED, and
"fix the dispatch button" (a false positive, see 2).
1. Signing an estimate (in person, buyer line; or by the texted link) now sets the linked estimates row
   (estimates.doc_id = the signed page) from draft/sent to 'accepted', so the job can be invoiced at once
   (1335's rule). The Approvals card and its email still fire, for generating the contract.
2. "Fix the dispatch button": measured, the button was never too small. gate_1206 measured it in whatever
   pan the PREVIOUS control's scrollIntoView left the sideways-scrolling board in, so it sat half under the
   pinned crew column. The gate is fixed (scripts/gate_1206.mjs); the page needs no change."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1a — the helper, beside isEstimateTitle
one("""function isEstimateTitle(t){
  /* 1015: publish() titles every numbered estimate doc""",
"""/* 1340 (Theo: a homeowner's signature counts as accepted). A signed estimate page is linked to its
   estimates row by doc_id; mark that row accepted so the job can be invoiced (1335). Only draft or sent
   rows move: an accepted, signed or declined one is left alone. Resolves true when a row changed. */
function crAcceptEstimateForDoc(docId){
  var cx = window.sb || window.supa;
  if(!docId || !cx || !cx.from) return Promise.resolve(false);
  return Promise.resolve(cx.from('estimates').update({ status:'accepted', updated_at:new Date().toISOString() })
    .eq('doc_id', docId).in('status', ['draft', 'sent']).select('id'))
    .then(function(r){ return !!(r && !r.error && r.data && r.data.length); }, function(){ return false; });
}
function isEstimateTitle(t){
  /* 1015: publish() titles every numbered estimate doc""")

# 1b — in-person, the buyer slot path
one("""          await db.update(current.id, { signed_at: _sAt });
          current.signed_at = _sAt;
          setEditorStatus(current.status, current.sent_at, _sAt);
          var _t = (titleInput.value || '').trim();
          if(/^contract/i.test(_t) && current.project_id){ await setStage(current.project_id, 'Approved'); }""",
"""          await db.update(current.id, { signed_at: _sAt });
          current.signed_at = _sAt;
          setEditorStatus(current.status, current.sent_at, _sAt);
          var _t = (titleInput.value || '').trim();
          if(/^contract/i.test(_t) && current.project_id){ await setStage(current.project_id, 'Approved'); }
          else if(isEstimateTitle(_t)){ await crAcceptEstimateForDoc(current.id); }   /* 1340 */""")

# 1c — in-person, the older single-signature path
one("""    }else if(isEstimateTitle(t)){
      notifyTeam(ADMIN_EMAILS, 'Estimate signed \\u2014 needs approval: ' + t,""",
"""    }else if(isEstimateTitle(t)){
      await crAcceptEstimateForDoc(current.id);   /* 1340: signed = accepted, so it can be invoiced */
      notifyTeam(ADMIN_EMAILS, 'Estimate signed \\u2014 needs approval: ' + t,""")
one("""      crTell('Estimate signed. It now appears in the admin Approvals queue \\u2014 a contract will be generated on approval.');""",
"""      crTell('Estimate signed and accepted \\u2014 it can be invoiced now. It also appears in Approvals, to generate the contract.');""")

assert s.count('>v2026-10-14 build 1339<button') == 1
s = s.replace('>v2026-10-14 build 1339<button', '>v2026-10-14 build 1340<button', 1)
one("{ b: 1339, d:'2026-10-14',",
"""{ b: 1340, d:'2026-10-14', t:'A signed estimate is an accepted estimate', s:'When the homeowner signs an estimate, on your phone or through the link you texted, the estimate is now marked Accepted straight away, so you can create the invoice without another step. It still shows in Approvals for making the contract.' },
  { b: 1339, d:'2026-10-14',""")
pl.write_atomic(path, s)
print('1340 applied')
