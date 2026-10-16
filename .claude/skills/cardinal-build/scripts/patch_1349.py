"""Build 1349 — Payments on the client page (Theo's pick from the preview: B, tabs).
After one bank check was typed in twice on a job and "paid so far" read wrong, Theo: "check the client profile
and see how confusing it is to see whats been paid so far. There has to be a better way."
1. A Payments card under the invoice card on the client page: Job total / Received / Paid out / Balance due,
   then tabs Received / Paid out / All. Each payment shows its date, method, the time it was entered and who
   entered it. Paid out (crew payments, paid commissions, outstanding draws) is the office's only.
2. A likely double entry is flagged: same amount to the cent, dated within 3 days; the later-entered one gets
   "Remove this one" / "Keep both".
3. Remove from the row's ⋯ menu, for whoever the database lets remove it (collections_delete).
No SQL. The new block is patch_1349_block.html, inserted before the document's closing </body>."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
block = open(os.path.join(os.path.dirname(__file__), 'patch_1349_block.html'), encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""  html += (window.CardinalAR && window.CardinalAR.jobBlock) ? window.CardinalAR.jobBlock(pr, fin) : '';
""",
"""  html += (window.CardinalAR && window.CardinalAR.jobBlock) ? window.CardinalAR.jobBlock(pr, fin) : '';
  /* 1349: every payment on the job, in and out, right under the invoice card */
  html += (window.CardinalJobPay && window.CardinalJobPay.html) ? window.CardinalJobPay.html(pr, fin) : '';
""")

one(">v2026-10-15 build 1347<button", ">v2026-10-16 build 1349<button")
one("""  { b: 1347, d:'2026-10-15',""",
"""  { b: 1349, d:'2026-10-16', t:'Every payment on a job, in one place', s:'The client page has a Payments card under the invoice. It shows the job total, what has been received, what has been paid out and the balance due, then every payment with its date, how it was paid, when it was entered and who entered it. Tabs switch between Received, Paid out and All. Paid out lists crew payments, paid commissions and draws, and only the office sees it. When two payments of the same amount are entered within a few days of each other, the second one is flagged so a check typed in twice is caught; remove it or keep both. A payment can be removed from its menu by the office, or by whoever entered it within 48 hours.' },
  { b: 1347, d:'2026-10-15',""")

i = s.rfind('</body>')
assert i > 0 and s.count('id="cr-jpay-script"') == 0
s = s[:i] + block + '\n' + s[i:]
pl.write_atomic(path, s)
print('patched', path)
