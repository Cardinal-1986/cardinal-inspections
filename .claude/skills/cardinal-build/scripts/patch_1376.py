"""Build 1376 — a Community invoice goes to the funding partner, never the person living in the house (audit W7, the
Community half; Theo: "Do 1"). Community bills one party for work on another's house (CLAUDE.md invariant), and the
invoice was the one send path still treating the occupant as the client:
- "Company text" texted projects.phone, which on a Community job is the OCCUPANT. It is gone from a Community
  invoice's Send row, and api/sms-link.js refuses a Community job server-side too (a stale page cannot do it).
- "My phone" and "Email" greeted the occupant by first name; on a Community invoice they say "Hello".
- The invoice document printed the occupant's phone and email under the partner's name. A Community invoice now
  leaves that row out (the empty placeholder is dropped at print, as everywhere else).
Insurance (the other half of W7) waits on Theo's pick. Retail is unchanged."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
api = os.path.join(os.path.dirname(os.path.abspath(path)), 'api', 'sms-link.js') if len(sys.argv) <= 2 else sys.argv[2]
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# the invoice document: no occupant contact under the partner's name
one("""  var tpl = prefillUserInfo(prefillClientInfo(INVOICE_TEMPLATE, pr));
  tpl = tpl.replace('[INV_NUM]', esc(num));""",
"""  /* 1376 (W7): on a Community job the partner is billed; pr.phone / pr.email are the occupant's, and would print
     under the partner's name. Leave the contact row empty; it is dropped at print like any empty placeholder. */
  var _billPr = (typeof projClaimType === 'function' && projClaimType(pr) === 'community') ? Object.assign({}, pr, { phone:'', email:'' }) : pr;
  var tpl = prefillUserInfo(prefillClientInfo(INVOICE_TEMPLATE, _billPr));
  tpl = tpl.replace('[INV_NUM]', esc(num));""")

# the invoice module: who a send greets
one("""  function firstName(pr){ return String((pr && pr.name) || '').trim().split(/\\s+/)[0] || 'there'; }
  function linkFor(pid, send){""",
"""  function firstName(pr){ return String((pr && pr.name) || '').trim().split(/\\s+/)[0] || 'there'; }
  /* 1376 (W7): a Community invoice is for the funding partner; pr.name is the occupant */
  function invIsComm(pr){ try{ return typeof projClaimType === 'function' && projClaimType(pr) === 'community'; }catch(_c){ return false; } }
  function invHello(pr){ return invIsComm(pr) ? 'Hello' : 'Hi ' + firstName(pr); }
  function linkFor(pid, send){""")

one("""        + B('', 'data-inv-sms', 'Company text') + B('', 'data-inv-text', 'My phone') + B('', 'data-inv-email', IC_MAIL + 'Email')""",
    """        + (invIsComm(pr) ? '' : B('', 'data-inv-sms', 'Company text'))   /* 1376: it texts the occupant's phone */
        + B('', 'data-inv-text', 'My phone') + B('', 'data-inv-email', IC_MAIL + 'Email')""")

one("""location.href = 'sms:?&body=' + encodeURIComponent('Hi ' + firstName(px) + ', here’s your invoice""",
    """location.href = 'sms:?&body=' + encodeURIComponent(invHello(px) + ', here’s your invoice""")
one("""encodeURIComponent('Hi ' + firstName(pe) + ',\\n\\nHere is your invoice""",
    """encodeURIComponent(invHello(pe) + ',\\n\\nHere is your invoice""")
# and a stale page's Company text says why, rather than texting
one("""    if((t = e.target.closest('[data-inv-sms]'))){ var ps = prById(t.getAttribute('data-inv-sms')); if(ps) companySms(ps); return; }""",
    """    if((t = e.target.closest('[data-inv-sms]'))){ var ps = prById(t.getAttribute('data-inv-sms'));
      if(ps && invIsComm(ps)){ crTell('A Community invoice goes to the funding partner \\u2014 send it with Email or My phone.'); return; }   /* 1376 */
      if(ps) companySms(ps); return; }""")

one(">v2026-10-19 build 1375<button", ">v2026-10-19 build 1376<button")
one("""  { b: 1375, d:'2026-10-19',""",
"""  { b: 1376, d:'2026-10-19', t:'Community invoices go to the partner', s:'On a Community job the invoice is for the funding partner, never the person living in the house. Company text is gone from a Community invoice, because it texted the homeowner’s phone. My phone and Email open with Hello instead of the homeowner’s first name, and the invoice no longer prints the homeowner’s phone and email under the partner’s name. Retail invoices are unchanged.' },
  { b: 1375, d:'2026-10-19',""")
pl.write_atomic(path, s)

# api/sms-link.js — refuse a Community job server-side
a = open(api, encoding='utf-8').read()
def aone(old, new):
    global a
    n = a.count(old); assert n == 1, (n, old[:90]); a = a.replace(old, new)
aone("""    var pq = SUPA_URL + '/rest/v1/projects?select=id,name,phone&id=eq.' +""",
     """    var pq = SUPA_URL + '/rest/v1/projects?select=id,name,phone,checklist&id=eq.' +""")
aone("""    var to = normPhone(rows[0].phone);
    if(!to){""",
     """    // 1376 (audit W7): on a Community job projects.phone is the OCCUPANT, and the funding partner is billed.
    // Never text a Community invoice from the company number; the app sends those by email to the partner.
    var ck = {}; try{ ck = typeof rows[0].checklist === 'string' ? JSON.parse(rows[0].checklist || '{}') : (rows[0].checklist || {}); }catch(_c){}
    var ct = String((ck.lead && ck.lead.claim_type) || ck.claim_type || '').toLowerCase();
    if(ct === 'community'){
      res.status(200).json({ ok:false, reason:'community',
        error:'A Community invoice goes to the funding partner, not the homeowner. Send it by email.' });
      return;
    }
    var to = normPhone(rows[0].phone);
    if(!to){""")
pl.write_atomic(api, a)
print('ok 1376')
