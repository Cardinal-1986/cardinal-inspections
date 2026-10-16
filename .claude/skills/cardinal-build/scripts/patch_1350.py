"""Build 1350 — what a job cost, gross profit, and who is owed money back (Theo's pick: B, inside the Payments card).
1. The Payments card (1349) gains a Costs tab: job_costs (material / labor / other) plus the crew payments already
   recorded in Crews, as labor. The office's summary adds Costs, Gross profit (job total − costs) and Margin.
2. Add a cost: what, amount, date, kind, paid by (company card or a teammate). Paid by a person → Reimburse,
   shown as "Needs paid" until the office marks it reimbursed.
3. A rep sees Received and My receipts only — never the job's costs or margin — and can add their own receipt.
   RLS in job_costs.sql enforces it (applied and tested before this build).
4. Invoices & Payments gains "Owed back to the team": every unpaid reimbursement across jobs, Mark reimbursed.
SQL first: job_costs.sql. The block is patch_1350_block.html, replacing 1349's block whole."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
here = os.path.dirname(__file__)
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
old_block = open(os.path.join(here, 'patch_1349_block.html'), encoding='utf-8').read()
new_block = open(os.path.join(here, 'patch_1350_block.html'), encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one(old_block, new_block)
one("""        body.innerHTML = readyHtml + html + depHtml;
      }
    }
    remWire();
  }""",
"""        body.innerHTML = readyHtml + html + depHtml;
      }
    }
    remWire();
    /* 1350: unpaid reimbursements across every job, at the top (office only; it fetches its own rows) */
    try{ if(window.CardinalJobPay && window.CardinalJobPay.owedInto) window.CardinalJobPay.owedInto(body); }catch(_){}
  }""")
one(">v2026-10-16 build 1349<button", ">v2026-10-16 build 1350<button")
one("""  { b: 1349, d:'2026-10-16',""",
"""  { b: 1350, d:'2026-10-16', t:'What a job cost, its profit, and who is owed back', s:'The Payments card on the client page has a Costs tab. Add what the job cost (material, labor or other), when, and who paid for it. Crew payments recorded in Crews count as labor by themselves. The card shows the job\\'s costs, gross profit and margin, with a coloured bar splitting the job into material, labor, other and profit. When someone paid out of their own pocket, tick Reimburse: it shows as Needs paid until the office marks it reimbursed, and Invoices & Payments lists everything still owed back to the team. Costs and profit are office only; a rep sees and adds their own receipts and whether they have been paid back.' },
  { b: 1349, d:'2026-10-16',""")
pl.write_atomic(path, s)
print('patched', path)
