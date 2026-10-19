"""Build 1380 — the client band's Email / Text / Call find the client's number and email wherever the job keeps them
(Theo, 19 Oct, with a screenshot: "Major no no put the phone icon and email back in the client profile").
The phone band (791) drew Email only when projects.email was set and Text / Call only when projects.phone was, and
hid a button with nothing behind it. Measured 19 Oct (counts only): of 297 jobs, 74 have no projects.phone and 214 no
projects.email; 12 keep the phone only in the lead. The screenshot's job has neither anywhere, so it showed nothing. Some
jobs keep the contact in the lead (checklist.lead.phone / homeowner_phone / phones[], lead.email /
homeowner_email / emails[]) — 759 counted 11 of 34 with the phone only there and wrote projPhone() as the app's one
answer. The band never used it, so on those jobs it showed no buttons at all. It now reads projPhone() and the same
order for email, in the buttons and in the panel they open. And the three buttons are always drawn, as
Theo asked: with nothing on file, a tap opens Edit client info to add it.
Nothing is written."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""  function hidePop(bar){""",
"""  /* 1380: the client's number and email wherever the job keeps them — projPhone() (759) is the app's one answer
     for the phone; email follows the same order: the job, then the lead. */
  function nbContact(pr){
    var L = {};
    try{ L = (typeof parseCkAll === 'function' ? parseCkAll(pr).lead : null) || {}; }catch(_l){ L = {}; }
    var ph = { digits: String(pr.phone || '').replace(/[^0-9+]/g, ''), pretty: String(pr.phone || '') };
    try{ if(typeof projPhone === 'function') ph = projPhone(pr); }catch(_p){}
    var em = String(pr.email || L.email || L.homeowner_email || (L.emails && L.emails[0] && L.emails[0].v) || '').trim();
    return { tel: String(ph.digits || ''), show: String(ph.pretty || ph.digits || ''), email: /@/.test(em) ? em : '' };
  }
  function hidePop(bar){""")

one("""    var tel = String(pr.phone || '').replace(/[^0-9+]/g, '');
    var map = {
      call : { lbl:'Phone',  val: pr.phone || tel, href:'tel:'  + tel, go:'Call'  },
      text : { lbl:'Text',   val: pr.phone || tel, href:'sms:'  + tel, go:'Text'  },
      email: { lbl:'Email',  val: pr.email || '',  href:'mailto:' + (pr.email || ''), go:'Email' }""",
"""    var nc = nbContact(pr), tel = nc.tel;   /* 1380 */
    var map = {
      call : { lbl:'Phone',  val: nc.show || tel, href:'tel:'  + tel, go:'Call'  },
      text : { lbl:'Text',   val: nc.show || tel, href:'sms:'  + tel, go:'Text'  },
      email: { lbl:'Email',  val: nc.email,       href:'mailto:' + nc.email, go:'Email' }""")

one("""    var tel = String(pr.phone || '').replace(/[^0-9+]/g, '');

""", """    var nc0 = nbContact(pr), tel = nc0.tel;   /* 1380: wherever the job keeps it */

""")
one("""    if(pr.email) acts += '<button class="nb-ico" type="button" data-cr-act="email" aria-label="Email">' + svg('mail') + '</button>';""",
    """    if(nc0.email) acts += '<button class="nb-ico" type="button" data-cr-act="email" aria-label="Email">' + svg('mail') + '</button>';""")

# 1380 (Theo: "just add a phone logo at the top like it was even if they don't have a number"): the three buttons
# are ALWAYS drawn, exactly as before. With nothing on file, the panel a tap opens says so instead of dialling.
one("""    if(nc0.email) acts += '<button class="nb-ico" type="button" data-cr-act="email" aria-label="Email">' + svg('mail') + '</button>';
    if(tel)      acts += '<button class="nb-ico" type="button" data-cr-act="text" aria-label="Text">' + svg('chat') + '</button>';
    if(tel)      acts += '<button class="nb-ico" type="button" data-cr-act="call" aria-label="Call">' + svg('phone') + '</button>';""",
"""    acts += '<button class="nb-ico" type="button" data-cr-act="email" aria-label="Email">' + svg('mail') + '</button>';   /* 1380: always */
    acts += '<button class="nb-ico" type="button" data-cr-act="text" aria-label="Text">' + svg('chat') + '</button>';
    acts += '<button class="nb-ico" type="button" data-cr-act="call" aria-label="Call">' + svg('phone') + '</button>';""")
one("""    if(!map || !map.val){ hidePop(bar); return; }""",
"""    if(!map){ hidePop(bar); return; }
    /* 1380 (Theo): nothing on file — open Edit client info to add it */
    if(!map.val){ hidePop(bar); if(typeof openProjModal === 'function') openProjModal(pr); return; }""")
one("""    var go = p.querySelector('[data-cr-pop-go]');
    go.setAttribute('href', map.href);
    go.textContent = map.go;
    var cp = p.querySelector('[data-cr-pop-copy]');
    if(cp) cp.textContent = 'Copy';""",
"""    var go = p.querySelector('[data-cr-pop-go]');
    go.setAttribute('href', map.href);
    go.textContent = map.go;
    var cp = p.querySelector('[data-cr-pop-copy]');
    if(cp) cp.textContent = 'Copy';
    go.style.display = ''; if(cp) cp.style.display = '';""")
one(">v2026-10-19 build 1379<button", ">v2026-10-19 build 1380<button")
one("""  { b: 1379, d:'2026-10-19',""",
"""  { b: 1380, d:'2026-10-19', t:'Email, Text and Call are back at the top of every client', s:'On a phone, the band at the top of a client’s page showed Email, Text and Call only when the number and email were saved in one particular place. Some clients have them saved with the lead instead, so the buttons were missing. The band now finds the number and email wherever the job keeps them. And the buttons are always there now. If a client has no number or email saved, tapping the button opens Edit client info so you can add it.' },
  { b: 1379, d:'2026-10-19',""")
pl.write_atomic(path, s)
print('ok 1380')
