"""Build 1314 — one balance everywhere (invoicing audit M2–M6, M10, R1; Theo: "yes please fix
invoicing on everything" / "Why the words service invoice instead of just invoice").

  1. The pay link, the share page and the reminder texts now total a job the way the app
     does (jobFinance): signed contract documents or the contracts table, whichever is more,
     PLUS manual extras; the invoice's own stored total only when neither exists. Before,
     the server skipped the extras and the contracts table, so checkout could ask for a
     different number than the invoice printed.
  2. A bank (ACH) payment still processing blocks a second checkout — before, the ledger
     could not see it and the client could pay the full balance twice.
  3. The last two old money-in doors close: the worksheet "Amount Collected" box and the
     "From signed contracts" row both wrote a store that Balance Due ignores once a job has
     any recorded payment, and that the server never reads. Both now go to Record payment.
     (Dan's two Zelle payments, the only money still in the old store, were moved into the
     payments ledger the same session.)
  4. "Paid this month" read a date the app never loaded, so it was always $0. It loads now.
  5. A failed payments read no longer looks like "nobody paid": the last good figures stay
     and the app says the payments did not load.
  6. Saving an invoice no longer overwrites its stored total with the balance due.
  7. The invoice heading reads INVOICE, not SERVICE INVOICE.
Usage: python3 patch_1314.py [root]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../')
P = lambda f: os.path.join(ROOT, f)

def edit(path, pairs):
    s = pl.load(path)
    for old, new in pairs:
        assert s.count(old) == 1, (path, old[:90], s.count(old))
        s = s.replace(old, new)
    pl.write_atomic(path, s)

# ---- server: owedOn's invoice branch, byte-identical in pay.js and share.js ----
OLD_INV = """    const jobTotal = contractTotal > 0 ? contractTotal : (Number(rep.total) || 0);
    return { cents: Math.round((jobTotal - collected) * 100), label: 'Amount due' };"""
NEW_INV = """    // 1314: the job total is jobFinance()'s, not a narrower one. Signed contract
    // documents OR the contracts table (whichever carries more — never both), plus
    // manual extras; the invoice's own stored total only when neither exists.
    let tableTotal = 0;
    for (const r of await readRows(sbHeaders, 'contracts',
        `${SUPABASE_URL}/rest/v1/contracts?project_id=eq.${rep.project_id}&select=total,homeowner_signed_at,voided_at`)) {
      if (r.homeowner_signed_at && !r.voided_at) tableTotal += Number(r.total) || 0;
    }
    const pj = (await readRows(sbHeaders, 'projects',
        `${SUPABASE_URL}/rest/v1/projects?id=eq.${rep.project_id}&select=checklist&limit=1`))[0];
    let manual = 0;
    try {
      const ck = pj && (typeof pj.checklist === 'string' ? JSON.parse(pj.checklist || '{}') : (pj.checklist || {}));
      manual = Number(ck && ck.manual_value) || 0;
    } catch (_) { manual = 0; }
    const signedTotal = Math.max(contractTotal, tableTotal);
    const jobTotal = signedTotal > 0 ? signedTotal + manual
                   : (manual > 0 ? manual : (Number(rep.total) || 0));
    return { cents: Math.round((jobTotal - collected) * 100), label: 'Amount due' };"""
edit(P('api/share.js'), [(OLD_INV, NEW_INV)])
edit(P('api/pay.js'), [(OLD_INV, NEW_INV),
  ("""    // hosted Checkout — Stripe holds the card form, so no card data touches us
    const stripe = new Stripe(sk);
""", """    // hosted Checkout — Stripe holds the card form, so no card data touches us
    const stripe = new Stripe(sk);
    /* 1314: an ACH debit is invisible to the ledger until it settles (days later), so
       a client reopening the link saw the full balance again and could pay it twice.
       A payment still processing on this job stops a new checkout. Fail closed: if
       Stripe cannot be asked, no checkout either. */
    if (rep.project_id) {
      try {
        const pend = await stripe.paymentIntents.search({
          query: `metadata['project_id']:'${rep.project_id}' AND status:'processing'`, limit: 1 });
        if (pend && pend.data && pend.data.length) {
          res.status(409).send('A payment on this job is already on its way \\u2014 bank payments take 3\\u20135 business days to clear. There is no need to pay again.');
          return;
        }
      } catch (e) {
        res.setHeader('Retry-After', '120');
        res.status(503).send('We could not check for a payment already in progress. Please open the link again in a few minutes.');
        return;
      }
    }
""")])

# ---- server: remind.js totals the job the same way ----
edit(P('api/remind.js'), [
  ("""      fetch(SUPABASE_URL + '/rest/v1/payment_reminders?project_id=' + inList + '&select=project_id,sent_at,ok&order=sent_at.desc', { headers: H })
    ]);""",
   """      fetch(SUPABASE_URL + '/rest/v1/payment_reminders?project_id=' + inList + '&select=project_id,sent_at,ok&order=sent_at.desc', { headers: H }),
      // 1314: the contracts table is the second contract store jobFinance() reads
      fetch(SUPABASE_URL + '/rest/v1/contracts?project_id=' + inList + '&select=project_id,total,homeowner_signed_at,voided_at', { headers: H })
    ]);"""),
  ("""    var logRows = await reads[3].json();
""", """    var logRows = await reads[3].json();
    var ctrRows = await reads[4].json();
    var ctrByP = {}; ctrRows.forEach(function (c) {
      if (c.homeowner_signed_at && !c.voided_at) ctrByP[c.project_id] = (ctrByP[c.project_id] || 0) + (Number(c.total) || 0);
    });
"""),
  ("""      var jobTotal = contractTotal > 0 ? contractTotal : (Number(inv.total) || 0);""",
   """      // 1314: the same total the app and the pay link use — contract docs or the
      // contracts table, whichever is more, plus manual extras
      var manual = 0;
      try { var ck0 = typeof p.checklist === 'string' ? JSON.parse(p.checklist || '{}') : (p.checklist || {}); manual = Number(ck0 && ck0.manual_value) || 0; } catch (_) { manual = 0; }
      var signedTotal = Math.max(contractTotal, ctrByP[pid] || 0);
      var jobTotal = signedTotal > 0 ? signedTotal + manual : (manual > 0 ? manual : (Number(inv.total) || 0));"""),
])

# ---- app ----
CL = """  { b: 1314, d:'2026-10-11', t:'One balance everywhere', s:'The pay link, the reminder texts and the app could each come up with a different amount owed \\u2014 the server ignored extras added to a job and payments typed into the old Amount Collected box. They all use the same total now, and there is one place to record money in: Record payment. A bank payment still clearing stops the client paying twice. Paid this month finally counts this month\\u2019s payments (it always read $0). If payments fail to load, the app says so instead of showing every job as unpaid. The invoice heading now just says INVOICE.' },"""
edit(P('index.html'), [
  ("var INVOICE_TEMPLATE = buildEstimate('SERVICE <span>INVOICE</span>', INVOICE_BODY, INVOICE_TERMS);",
   "var INVOICE_TEMPLATE = buildEstimate('<span>INVOICE</span>', INVOICE_BODY, INVOICE_TERMS);   /* 1314: Theo \\u2014 \"just invoice\" */"),
  ("    var r = await sb.from('collections').select('project_id,amount');",
   "    /* 1314: collected_at too \\u2014 Paid this month (cr-ar-script) reads it, and without it the KPI was always $0 */\n    var r = await sb.from('collections').select('project_id,amount,collected_at,created_at');"),
  ("      moneyDb.collections().catch(function(){ return []; }),",
   "      /* 1314: a failed read is NOT an empty ledger \\u2014 null keeps the last good figures (see below) */\n      moneyDb.collections().catch(function(){ return null; }),"),
  ("    indexCollections(res[5]);",
   """    /* 1314: [] here used to turn one failed request into "nobody has paid anything" on every
       Balance Due, the A/R list and the aging chart. Keep what we had and say so. */
    if(res[5] === null){
      try{ crTell('Payments did not load just now \\u2014 the balances on screen may be out of date. Pull down to refresh.'); }catch(_){}
    }else indexCollections(res[5]);"""),
  ("        '<span><label>Amount Collected</label><input type=\"number\" min=\"0\" step=\"0.01\" class=\"wspaid\" ' +\n          'data-doc=\"' + r.id + '\" value=\"' + (paid || '') + '\" placeholder=\"0.00\"' + (r.signed_at ? '' : ' disabled') + '></span>' +\n        '<span><label>Remaining</label><b>' + (tot ? fmtMoney(rem) : '--') + '</b></span>' +",
   "        /* 1314: the Amount Collected box wrote a store Balance Due ignores once any payment is\n           recorded, and the pay link never reads. Money in has one door: Record payment (below). */"),
  ("      '</div></div>';\n  }).join('');\n}\nasync function createInvoiceFor(pr){",
   "      '</div></div>';\n  }).join('') + wsFoot;\n}\nasync function createInvoiceFor(pr){"),
  ("  mount.innerHTML = invBtn + fin.contracts.map(function(r){",
   "  var wsFoot = '<div class=\"wsrow\" style=\"display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;\"><span>Paid <b>' + fmtMoney(fin.paid, true) + '</b> \\u00b7 Balance due <b>' + fmtMoney(fin.balance, true) + '</b></span>' +\n    '<button class=\"chipbtn\" data-wsrecord=\"1\" type=\"button\">Record payment</button></div>';\n  mount.innerHTML = invBtn + fin.contracts.map(function(r){"),
  ("  if(e.target.closest('[data-mkinv]') && currentProject) createInvoiceFor(currentProject);",
   "  if(e.target.closest('[data-mkinv]') && currentProject) createInvoiceFor(currentProject);\n  if(e.target instanceof Element && e.target.closest('[data-wsrecord]') && currentProject){ try{ payGoLogCollection(); }catch(_){} }   /* 1314 */"),
  ("  if(e.target.closest('[data-paycontracts]')){ openContractPaid(); return; }",
   "  /* 1314: \"From signed contracts\" opened a form that wrote the old worksheet store. It now goes\n     where every dollar in goes. openContractPaid() stays defined for its gate, unreached. */\n  if(e.target.closest('[data-paycontracts]')){ payGoLogCollection(); return; }"),
  ("    var tot = readEstimateTotal();\n    if(tot !== null) fields.total = tot;",
   "    var tot = readEstimateTotal();\n    /* 1314: on an invoice #estTotal is BALANCE DUE, not the job total \\u2014 saving used to\n       overwrite the stored total the server falls back to, then subtract payments again. */\n    if(tot !== null && !/^invoice/i.test(fields.title)) fields.total = tot;"),
  (">v2026-10-11 build 1313<button", ">v2026-10-11 build 1314<button"),
  ("var CHANGELOG = [", "var CHANGELOG = [\n" + CL),
])
print('1314 applied')
