"""Build 1378 — an insurance invoice bills only the homeowner's part (audit W7 option 1; Theo: "2 then 1", then "1").
The homeowner's part is "Your total out of pocket" from the INSURANCE & YOUR PART box (1324) on the job's signed
contract: the deductible plus any upgrades they chose. What they owe on the invoice is that, less what THEY have paid;
carrier and partner payments are not theirs (financing is). One rule, written three times on purpose:
  crInsPart() in the app, homeOwedOn() in api/pay.js and api/share.js (byte-identical, like owedOn).
- The invoice prints "Your part" / "You have paid" / "Balance due" from it. Its stored total stays the job's (A/R
  reads it), and the job's priced lines are not seeded onto it.
- The pay link (share page + checkout), Company text and the receipt use it.
- A signed contract with no box (anything signed before 1324) leaves the invoice on 1377's by-hand path, and says so.
The job's own money (Total / Paid / Balance on the Payments card and A/R) is unchanged: that is the whole job, carrier
included. collections.source is read, never written."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
root = os.path.dirname(os.path.abspath(path)) if len(sys.argv) <= 2 else sys.argv[2]
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

NOBOX = 'This insurance job\\u2019s signed contract has no INSURANCE & YOUR PART figure, so its invoice goes out by hand: open it, Download it, then Mark sent.'

# the cache carries who paid
one("""    var r = await sb.from('collections').select('project_id,amount,collected_at,created_at');""",
    """    var r = await sb.from('collections').select('project_id,amount,collected_at,created_at,source');   /* 1378: who paid (insurance / partner / the homeowner) */""")

# the app's one rule
one("""async function createInvoiceFor(pr){""",
"""/* 1378 (W7 option 1): what the HOMEOWNER owes on an insurance job — "Your total out of pocket" from the INSURANCE &
   YOUR PART box (1324) on the newest signed contract, less what the homeowner has paid (carrier and partner money is
   not theirs). null when no signed contract carries the figure. Same rule as homeOwedOn() in api/pay.js. */
function crOopFromHtml(html){
  var m = /data-ip="oop"[^>]*>\\s*([^<]*)</.exec(String(html || ''));
  if(!m) return null;
  var t = m[1].trim();
  if(!t || t.charAt(0) === '[') return null;
  var v = Number(t.replace(/[^0-9.\\-]/g, ''));
  return isFinite(v) && v > 0 ? v : null;
}
async function crInsPart(pr){
  if(!pr || !sb) return null;
  var r = await sb.from('inspection_reports').select('title,html,signed_at').eq('project_id', pr.id);
  if(r.error) throw r.error;
  var part = null, at = '';
  (r.data || []).forEach(function(d){
    if(!/^contract/i.test(String(d.title || '').trim()) || !d.signed_at) return;
    var v = crOopFromHtml(d.html);
    if(v !== null && String(d.signed_at) > at){ part = v; at = String(d.signed_at); }
  });
  if(part === null) return null;
  var paid = 0;
  (cacheCollections || []).forEach(function(c){
    if(c.project_id !== pr.id) return;
    var src = String(c.source || '').toLowerCase();
    if(src !== 'insurance' && src !== 'partner') paid += Number(c.amount) || 0;
  });
  var pv = /** @type {number} */ (part);
  return { value: pv, paid: paid, balance: Math.round((pv - paid) * 100) / 100 };
}
async function createInvoiceFor(pr){""")

one("""async function createInvoiceFor1315(pr){
  var fin = jobFinance(pr);""",
"""async function createInvoiceFor1315(pr){
  var fin = jobFinance(pr);
  /* 1378: an insurance invoice bills the homeowner's part, not the job */
  var _insJob = false, _part = null;
  try{ _insJob = projClaimType(pr) === 'insurance'; }catch(_){}
  if(_insJob){
    try{ _part = await crInsPart(pr); }catch(_ip){ _part = null; }
    if(_part && !(_part.balance > 0.005)){ crTell('The homeowner\\u2019s part (' + fmtMoney(_part.value, true) + ') is paid \\u2014 there is nothing to invoice them.'); return; }
    if(_part) fin = Object.assign({}, fin, { value: _part.value, paid: _part.paid, balance: _part.balance });
  }""")

one("""  tpl = tpl.replace('[INV_TOTAL]', fmtMoney(fin.value, true));""",
"""  if(_part){   /* 1378: say what the figures are */
    tpl = tpl.replace('border-bottom:1px solid #ddd;">Total</td>', 'border-bottom:1px solid #ddd;">Your part (deductible + upgrades)</td>');
    tpl = tpl.replace('border-bottom:1px solid #ddd;">Paid</td>', 'border-bottom:1px solid #ddd;">You have paid</td>');
  }
  tpl = tpl.replace('[INV_TOTAL]', fmtMoney(fin.value, true));""")

one("""    crTell('Invoice ' + num + ' is ready. Send it from the job\\u2019s invoice card or the editor \\u2014 the job moves to Invoiced when it goes out.', 'ok');   /* 1318; 1367: a success, so the green kind */""",
"""    if(_insJob && !_part) crTell('Invoice ' + num + ' is ready. """ + NOBOX + """', 'ok');   /* 1378 */
    else crTell('Invoice ' + num + ' is ready' + (_part ? ' for the homeowner\\u2019s part, ' + fmtMoney(_part.balance, true) : '') + '. Send it from the job\\u2019s invoice card or the editor \\u2014 the job moves to Invoiced when it goes out.', 'ok');   /* 1318; 1367: a success, so the green kind */""")

# the Invoices module's link maker: an insurance invoice needs the figure, no longer refused outright
one("""    if(invIsIns(prById(pid))) return Promise.reject(new Error('An insurance invoice goes out by hand for now: most of its balance is the carrier\\u2019s money. Open it, Download it, then Mark sent.'));
    return ensureTokenForRow(inv).then(function(tok){ if(send) markInvoiceSent(pid, inv); return payUrl(tok); });""",
"""    var invMintLink = function(){ return ensureTokenForRow(inv).then(function(tok){ if(send) markInvoiceSent(pid, inv); return payUrl(tok); }); };
    /* 1378: an insurance invoice's link bills the homeowner's part; with no part on the signed contract it goes by hand */
    if(invIsIns(prById(pid))) return Promise.resolve(window.crInsPart ? window.crInsPart(prById(pid)) : null).then(function(p){
      if(!p) throw new Error('""" + NOBOX + """');
      return invMintLink();
    });
    return invMintLink();""")

one("""    var sendRow = !inv ? '' : invIsIns(pr)
      ? '<div class="crji-sendrow" data-sendrow="' + pid + '" hidden><span class="crji-insnote">' + 'An insurance invoice goes out by hand for now: most of its balance is the carrier\\u2019s money. Open it, Download it, then Mark sent.' + '</span></div>'   /* 1377 */
      : '<div class="crji-sendrow" data-sendrow="' + pid + '" hidden>'""",
"""    var sendRow = !inv ? '' : '<div class="crji-sendrow" data-sendrow="' + pid + '" hidden>'   /* 1378: insurance sends again; linkFor checks the part */""")
one("""
.crji-sendrow .crji-insnote{ display:block; font:600 13px 'Segoe UI',Arial,sans-serif; line-height:1.4; color:var(--rbe-mute,#b8bec6); padding:6px 2px; }   /* 1377 */""", "")

# the editor guard
one("""    if(_ict === 'insurance'){ crTell('An insurance invoice goes out by hand for now: most of its balance is the carrier\\u2019s money. Open it, Download it, then Mark sent.'); return false; }
    return true;""",
"""    if(_ict === 'insurance'){   /* 1378: it may go once its contract carries the homeowner's part */
      var _pp = null; try{ _pp = await crInsPart(_ip); }catch(_e){ _pp = null; }
      if(!_pp){ crTell('""" + NOBOX + """'); return false; }
    }
    return true;""")

# the stored total stays the JOB's (A/R and 1357 read it as such); the job's priced lines are not seeded onto a
# homeowner's-part invoice, where $9,000 of line items beside "Your part $1,500" would read as the bill
one("""      await db.update(id, { share_token: _itok, total: fin.value });""",
    """      await db.update(id, { share_token: _itok, total: _part ? (Number(jobFinance(pr).value) || 0) : fin.value });   /* 1378: the job's total, as every invoice */""")
one("""    try{ if(window.CardinalInvLines) await window.CardinalInvLines.seed(pr, id); }catch(_sl){}""",
    """    try{ if(window.CardinalInvLines && !_part) await window.CardinalInvLines.seed(pr, id); }catch(_sl){}   /* 1378: not on a homeowner's-part invoice */""")

one(">v2026-10-19 build 1377<button", ">v2026-10-19 build 1378<button")
one("""  { b: 1377, d:'2026-10-19',""",
"""  { b: 1378, d:'2026-10-19', t:'Insurance invoices ask for the homeowner’s part', s:'An invoice on an insurance job now asks the homeowner only for their part: the deductible plus any upgrades, from the INSURANCE & YOUR PART box on the signed contract, less what they have already paid. Insurance-company checks are not counted against it. The invoice reads Your part, You have paid and Balance due, and the pay link, the text and the receipt all use the same figure. A contract signed before that box existed has no figure, so its invoice still goes out by hand, and the app says so.' },
  { b: 1377, d:'2026-10-19',""")
pl.write_atomic(path, s)

# ---- the server ----
def edit(rel, pairs):
    p = os.path.join(root, rel); t = open(p, encoding='utf-8').read()
    for old, new in pairs:
        n = t.count(old); assert n == 1, (rel, n, old[:80]); t = t.replace(old, new)
    pl.write_atomic(p, t)

HOME = """/* 1378 (W7 option 1): what the HOMEOWNER owes on an insurance invoice — "Your total out of pocket" from the
   INSURANCE & YOUR PART box (1324) on the newest signed contract, less what the homeowner has paid (carrier and
   partner money is not theirs). null when no signed contract carries the figure: that invoice goes out by hand
   (1377). A failed read throws LookupFailed. KEEP IN SYNC: byte-identical in api/pay.js and api/share.js, and the
   same rule as crInsPart() in index.html. */
function oopFromHtml(html) {
  const m = /data-ip="oop"[^>]*>\\s*([^<]*)</.exec(String(html || ''));
  if (!m) return null;
  const t = m[1].trim();
  if (!t || t.charAt(0) === '[') return null;
  const v = Number(t.replace(/[^0-9.\\-]/g, ''));
  return isFinite(v) && v > 0 ? v : null;
}
async function homeOwedOn(sbHeaders, rep) {
  let part = null, at = '';
  for (const r of await readRows(sbHeaders, 'inspection_reports',
      `${SUPABASE_URL}/rest/v1/inspection_reports?project_id=eq.${rep.project_id}&select=title,html,signed_at`)) {
    if (!/^contract/i.test(String(r.title || '').trim()) || !r.signed_at) continue;
    const v = oopFromHtml(r.html);
    if (v !== null && String(r.signed_at) > at) { part = v; at = String(r.signed_at); }
  }
  if (part === null) return null;
  let paid = 0;
  for (const c of await readRows(sbHeaders, 'collections',
      `${SUPABASE_URL}/rest/v1/collections?project_id=eq.${rep.project_id}&select=amount,source`)) {
    const src = String(c.source || '').toLowerCase();
    if (src !== 'insurance' && src !== 'partner') paid += Number(c.amount) || 0;
  }
  return { cents: Math.round((part - paid) * 100), label: 'Your part',
           totalCents: Math.round(part * 100), paidCents: Math.round(paid * 100) };
}

"""
ANCHOR_SHARE = """// payUi: a polished, trustworthy pay bar."""
edit('api/share.js', [
  (ANCHOR_SHARE, HOME + ANCHOR_SHARE),
  ("""        const owed = await owedOn(sbHeaders, rows[0]);
        const { cents, label } = owed;
        if (isInvoiceDoc) html = liveInvoiceSummary(html, owed);   /* 1320 */
        const insNoPay = isInvoiceDoc && await isInsuranceJob(sbHeaders, rows[0].project_id);   /* 1377 */
        if (!insNoPay && cents >= 50 && cents <= 10000000) {
          const ui = payUi(t, cents, label, rows[0].project || rows[0].title);
          html = html.includes('</body>') ? html.replace('</body>', ui + '\\n</body>') : html + ui;
        }""",
   """        // 1377/1378: an insurance invoice bills the homeowner's part; with none on the signed contract, no pay bar
        const insInv = isInvoiceDoc && await isInsuranceJob(sbHeaders, rows[0].project_id);
        const owed = insInv ? await homeOwedOn(sbHeaders, rows[0]) : await owedOn(sbHeaders, rows[0]);
        if (owed) {
          const { cents, label } = owed;
          if (isInvoiceDoc) html = liveInvoiceSummary(html, owed);   /* 1320 */
          if (cents >= 50 && cents <= 10000000) {
            const ui = payUi(t, cents, label, rows[0].project || rows[0].title);
            html = html.includes('</body>') ? html.replace('</body>', ui + '\\n</body>') : html + ui;
          }
        }"""),
])
edit('api/pay.js', [
  ("""export default async function handler(req, res) {""", HOME + """export default async function handler(req, res) {"""),
  ("""    // 1377 (W7): an insurance invoice is not paid online for now — its balance is mostly the carrier's money
    if (/^invoice/i.test(String(rep.title || '').trim()) && await isInsuranceJob(sbHeaders, rep.project_id)) {
      res.status(400).send('This invoice is not paid online. Please call Cardinal Roofing & Renovations about your part of the insurance job.');
      return;
    }

    let owed;
    try { owed = await owedOn(sbHeaders, rep); }""",
   """    // 1377/1378 (W7): an insurance invoice bills the homeowner's part only
    const insInv = /^invoice/i.test(String(rep.title || '').trim()) && await isInsuranceJob(sbHeaders, rep.project_id);

    let owed;
    try { owed = insInv ? await homeOwedOn(sbHeaders, rep) : await owedOn(sbHeaders, rep); }"""),
  ("""    const { cents, label } = owed;
    if (!(cents >= MIN_CENTS && cents <= MAX_CENTS)) {""",
   """    if (!owed) {   /* 1378: no homeowner's part on the signed contract — not paid online */
      res.status(400).send('This invoice is not paid online. Please call Cardinal Roofing & Renovations about your part of the insurance job.');
      return;
    }
    const { cents, label } = owed;
    if (!(cents >= MIN_CENTS && cents <= MAX_CENTS)) {"""),
  ("""export { owedOn };""", """export { owedOn, homeOwedOn };"""),
])
edit('api/sms-link.js', [
  ("""    // 1377 (W7): an insurance invoice bills the whole job, most of it the carrier's money — no pay link texted
    if(ct === 'insurance' || (!(ck.lead && ck.lead.claim_type) && ck.lead && ck.lead.insurance)){
      res.status(200).json({ ok:false, reason:'insurance',
        error:'An insurance invoice goes out by hand for now: open it, Download it, then Mark sent.' });
      return;
    }""",
   """    // 1377/1378 (W7): an insurance invoice's link bills the homeowner's part, which must be on the signed contract
    // (the INSURANCE & YOUR PART box, 1324). With none, nothing is texted — it goes out by hand.
    if(ct === 'insurance' || (!(ck.lead && ck.lead.claim_type) && ck.lead && ck.lead.insurance)){
      var hasPart = false;
      try{
        var dq = await fetch(SUPA_URL + '/rest/v1/inspection_reports?select=title,html,signed_at&project_id=eq.' + encodeURIComponent(projectId),
          { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + caller._token } });
        var docs = dq.ok ? await dq.json() : [];
        hasPart = (Array.isArray(docs) ? docs : []).some(function(d){
          if(!/^contract/i.test(String(d.title || '').trim()) || !d.signed_at) return false;
          var m = /data-ip="oop"[^>]*>\\s*([^<]*)</.exec(String(d.html || ''));
          var t2 = m ? m[1].trim() : '';
          return !!t2 && t2.charAt(0) !== '[' && Number(t2.replace(/[^0-9.\\-]/g, '')) > 0;
        });
      }catch(_d){ hasPart = false; }
      if(!hasPart){
        res.status(200).json({ ok:false, reason:'insurance',
          error:'This insurance job\u2019s signed contract has no INSURANCE & YOUR PART figure, so its invoice goes out by hand: open it, Download it, then Mark sent.' });
        return;
      }
    }"""),
])
edit('api/receipt.js', [
  ("""import { owedOn } from './pay.js';""", """import { owedOn, homeOwedOn } from './pay.js';"""),
  ("""      const o = await owedOn(sbH, inv || { title:'Invoice', project_id:c.project_id, total:0 });""",
   """      // 1378: on an insurance job the homeowner's balance is their part (null when the contract has none: no balance line)
      const o = ct === 'insurance' ? (inv ? await homeOwedOn(sbH, inv) : null)
              : await owedOn(sbH, inv || { title:'Invoice', project_id:c.project_id, total:0 });"""),
])
print('ok 1378')
