"""Build 1377 — an insurance invoice carries no pay link for now (audit W7, insurance half; Theo picked "2 then 1").
An invoice bills the job's whole balance. On an insurance job most of that is the carrier's money, so a texted or
emailed pay link asked the homeowner to pay for what the insurance company owes. Until the invoice bills only the
homeowner's part (option 1, after the checks work lands), an insurance invoice goes out by hand:
- the app: every pay-link send in the Invoices module goes through linkFor(), which now refuses an insurance job
  with the instruction (open it, Download, Mark sent); the job card's Send row says so instead of three buttons;
  the editor's Share / Text / Email refuse an insurance invoice through the guard 1324 already put on all four.
- the server: api/share.js shows an insurance invoice with no pay bar, api/pay.js refuses one, api/sms-link.js
  refuses one. (api/remind.js already skips every non-retail job.)
Also closes a 1376 gap: the editor's Text pay link on a Community invoice pre-filled the OCCUPANT's number."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
root = os.path.dirname(os.path.abspath(path)) if len(sys.argv) <= 2 else sys.argv[2]
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

MSG = 'An insurance invoice goes out by hand for now: most of its balance is the carrier\\u2019s money. Open it, Download it, then Mark sent.'

# the Invoices module: the one place its pay links are made
one("""  function linkFor(pid, send){
    var inv = invoiceFor(pid);
    if(!inv) return Promise.reject(new Error('This job has no invoice yet — create one first.'));""",
"""  /* 1377 (W7, Theo "2 then 1"): an insurance invoice bills the whole job, most of it the carrier's money, so no pay
     link leaves the app for one until it bills only the homeowner's part */
  function invIsIns(pr){ try{ return typeof projClaimType === 'function' && projClaimType(pr) === 'insurance'; }catch(_c){ return false; } }
  function linkFor(pid, send){
    var inv = invoiceFor(pid);
    if(!inv) return Promise.reject(new Error('This job has no invoice yet — create one first.'));
    if(invIsIns(prById(pid))) return Promise.reject(new Error('""" + MSG + """'));""")

one("""    var sendRow = inv ? '<div class="crji-sendrow" data-sendrow="' + pid + '" hidden>'
        + (invIsComm(pr) ? '' : B('', 'data-inv-sms', 'Company text'))   /* 1376: it texts the occupant's phone */
        + B('', 'data-inv-text', 'My phone') + B('', 'data-inv-email', IC_MAIL + 'Email')
        + '</div>' : '';""",
"""    var sendRow = !inv ? '' : invIsIns(pr)
      ? '<div class="crji-sendrow" data-sendrow="' + pid + '" hidden><span class="crji-insnote">' + '""" + MSG + """' + '</span></div>'   /* 1377 */
      : '<div class="crji-sendrow" data-sendrow="' + pid + '" hidden>'
        + (invIsComm(pr) ? '' : B('', 'data-inv-sms', 'Company text'))   /* 1376: it texts the occupant's phone */
        + B('', 'data-inv-text', 'My phone') + B('', 'data-inv-email', IC_MAIL + 'Email')
        + '</div>';""")

# the editor: the guard 1324 put on Share link, Text, Email and Sign in person
one("""async function insPartOkToSend(){
  var t = (/** @type {any} */ (titleInput).value || '').trim();
  if(!isContractTitle(t)) return true;""",
"""async function insPartOkToSend(){
  var t = (/** @type {any} */ (titleInput).value || '').trim();
  /* 1377 (W7): an insurance invoice has no pay link for now — it goes out by hand */
  if(/^invoice/i.test(t)){
    var _ip = currentDocProject(), _ict = '';
    try{ _ict = _ip ? projClaimType(_ip) : ''; }catch(_){}
    if(_ict === 'insurance'){ crTell('""" + MSG + """'); return false; }
    return true;
  }
  if(!isContractTitle(t)) return true;""")

# the editor's Text: a Community invoice is for the partner; proj.phone is the occupant (1376 gap)
one("""      var tel = (proj && proj.phone) ? String(proj.phone).replace(/[^+\\d]/g, '') : '';
      /* 1315: texting an invoice's pay link is sending it */""",
"""      var tel = (proj && proj.phone) ? String(proj.phone).replace(/[^+\\d]/g, '') : '';
      /* 1377: on a Community job proj.phone is the occupant's; the partner is billed, so no number is filled in */
      try{ if(proj && projClaimType(proj) === 'community'){ tel = ''; if(name) body = body.replace('Hi ' + name + ' \\u2014 ', ''); } }catch(_){}
      /* 1315: texting an invoice's pay link is sending it */""")

one("""#cr-namebar{ display:none; }""", """#cr-namebar{ display:none; }
.crji-sendrow .crji-insnote{ display:block; font:600 13px 'Segoe UI',Arial,sans-serif; line-height:1.4; color:var(--rbe-mute,#b8bec6); padding:6px 2px; }   /* 1377 */""")

one(">v2026-10-19 build 1376<button", ">v2026-10-19 build 1377<button")
one("""  { b: 1376, d:'2026-10-19',""",
"""  { b: 1377, d:'2026-10-19', t:'Insurance invoices go out by hand for now', s:'An invoice asks for the whole job, and on an insurance job most of that is the insurance company’s money. Until the invoice can ask only for the homeowner’s part, an insurance invoice no longer carries a pay link: the app will not text, email or share one, and the link page shows no Pay button. Open the invoice, Download it, then Mark sent. Also, texting a Community invoice from the editor no longer fills in the homeowner’s number.' },
  { b: 1376, d:'2026-10-19',""")
pl.write_atomic(path, s)

# ---- the server ----
def edit(rel, pairs):
    p = os.path.join(root, rel); t = open(p, encoding='utf-8').read()
    for old, new in pairs:
        n = t.count(old); assert n == 1, (rel, n, old[:80]); t = t.replace(old, new)
    pl.write_atomic(p, t)

INS_FN = """
/* 1377 (W7): is this job an insurance job? An insurance invoice bills the whole job, most of it the carrier's money,
   so it carries no pay link until it bills only the homeowner's part. A failed read answers true: the safe side is
   no pay button, never one that may ask the homeowner for the carrier's money. */
async function isInsuranceJob(sbHeaders, projectId) {
  if (!projectId) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}&select=checklist&limit=1`, { headers: sbHeaders });
    if (!r.ok) return true;
    const row = (await r.json())[0];
    if (!row) return false;
    let ck = {}; try { ck = typeof row.checklist === 'string' ? JSON.parse(row.checklist || '{}') : (row.checklist || {}); } catch (_) {}
    const L = ck.lead || {};
    return String(L.claim_type || '').toLowerCase() === 'insurance' || (!L.claim_type && !!L.insurance);
  } catch (_) { return true; }
}
"""
edit('api/share.js', [
  ("""class LookupFailed extends Error {""", INS_FN.lstrip('\n') + """class LookupFailed extends Error {"""),
  ("""        const owed = await owedOn(sbHeaders, rows[0]);
        const { cents, label } = owed;
        if (isInvoiceDoc) html = liveInvoiceSummary(html, owed);   /* 1320 */
        if (cents >= 50 && cents <= 10000000) {""",
   """        const owed = await owedOn(sbHeaders, rows[0]);
        const { cents, label } = owed;
        if (isInvoiceDoc) html = liveInvoiceSummary(html, owed);   /* 1320 */
        const insNoPay = isInvoiceDoc && await isInsuranceJob(sbHeaders, rows[0].project_id);   /* 1377 */
        if (!insNoPay && cents >= 50 && cents <= 10000000) {"""),
])
edit('api/pay.js', [
  ("""class LookupFailed extends Error {""", INS_FN.lstrip('\n') + """class LookupFailed extends Error {"""),
])
edit('api/pay.js', [
  ("""    if (!rep) { res.status(404).send('This link is no longer available.'); return; }
""", """    if (!rep) { res.status(404).send('This link is no longer available.'); return; }
    // 1377 (W7): an insurance invoice is not paid online for now — its balance is mostly the carrier's money
    if (/^invoice/i.test(String(rep.title || '').trim()) && await isInsuranceJob(sbHeaders, rep.project_id)) {
      res.status(400).send('This invoice is not paid online. Please call Cardinal Roofing & Renovations about your part of the insurance job.');
      return;
    }
"""),
])
edit('api/sms-link.js', [
  ("""    if(ct === 'community'){
      res.status(200).json({ ok:false, reason:'community',
        error:'A Community invoice goes to the funding partner, not the homeowner. Send it by email.' });
      return;
    }""", """    if(ct === 'community'){
      res.status(200).json({ ok:false, reason:'community',
        error:'A Community invoice goes to the funding partner, not the homeowner. Send it by email.' });
      return;
    }
    // 1377 (W7): an insurance invoice bills the whole job, most of it the carrier's money — no pay link texted
    if(ct === 'insurance' || (!(ck.lead && ck.lead.claim_type) && ck.lead && ck.lead.insurance)){
      res.status(200).json({ ok:false, reason:'insurance',
        error:'An insurance invoice goes out by hand for now: open it, Download it, then Mark sent.' });
      return;
    }"""),
])
print('ok 1377')
