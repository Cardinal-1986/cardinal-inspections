"""Build 1375 — three sections of the client page fold on a phone (Theo, 19 Oct: "1 3 4", from the Client Page Folds
preview). Location, Assigned To and Google Reviews each become one line: the heading plus a short summary (the street,
the rep's name) and a chevron. One tap opens it, a second closes it. Job Details stays open (Theo's pick).
- Nothing is moved and nothing is deleted. The sections are hidden in place until opened, the same way 1225 folds the
  Admin row, so every module that paints or re-places them keeps doing so.
- The address is at the top of the page since 1374, so a folded Location loses nothing a rep needs every day.
- Open state is per job: another job opens folded, like the Admin row.
- Retail, phone (<=560px) only; the desktop and Insurance/Community pages are unchanged."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

FENCE = 'body:not(.claim-insurance):not(.claim-community) #projectView'

# the fold button exists everywhere and shows only on a retail phone
one("""#cr-namebar{ display:none; }
#cr-namebar .nb-pop[hidden]{ display:none; }
""",
"""#cr-namebar{ display:none; }
#cr-namebar .nb-pop[hidden]{ display:none; }
#projectView .cr-fold{ display:none; }   /* 1375: the phone folds; see the max-width:560px block */
""")

one("""  body:not(.claim-insurance):not(.claim-community) #projectView:not(.cr-admin-open) #dangerZone{ display:none !important; }
  body:not(.claim-insurance):not(.claim-community) #projectView #acxMount > [data-cr-ord="jdh"]{""",
"""  body:not(.claim-insurance):not(.claim-community) #projectView:not(.cr-admin-open) #dangerZone{ display:none !important; }
  /* 1375 (Theo's pick, "1 3 4"): Location, Assigned To and Google Reviews fold to their heading. The heading is the
     row; the button's ::before spans all of it, so a tap anywhere on the row opens it. Hidden in place, never moved,
     the Admin row's rule. Job Details stays open. */
  @@F #acxMount [data-cr-fold]{ position:relative; display:flex; align-items:center; min-height:44px; }
  @@F #acxMount .cr-fold{
    display:flex; align-items:center; gap:8px; margin-left:auto; min-width:0; max-width:62%; min-height:44px;
    padding:0 0 0 10px; background:none; border:0; cursor:pointer;
    font:600 13px 'Segoe UI',Arial,sans-serif; color:var(--rbe-mute,#b8bec6);
  }
  @@F #acxMount .cr-fold::before{ content:''; position:absolute; inset:0; }
  @@F #acxMount .cr-fold-s{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
  @@F #acxMount .cr-fold::after{ content:"\\203A"; flex:none; font-size:22px; line-height:1; transition:transform .15s; }
  @@F #acxMount .cr-fold[aria-expanded="true"]::after{ transform:rotate(90deg); }
  /* the Location pencil sits above the row's tap area when open, and goes with the card when folded */
  @@F #acxMount [data-cr-fold] .rt2{ position:relative; z-index:1; }
  @@F:not(.cr-open-loc) #acxMount > [data-cr-ord="loch"] .rt2{ display:none; }
  @@F:not(.cr-open-loc) #acxMount > [data-cr-ord="loc"],
  @@F:not(.cr-open-asg) #acxMount > .acxassignsec,
  @@F:not(.cr-open-rv) #acxMount > .rvcard > .rvbody{ --cr-stack:"1375 folded on a phone until its row is tapped (Theo: 1 3 4)"; display:none !important; }
  body:not(.claim-insurance):not(.claim-community) #projectView #acxMount > [data-cr-ord="jdh"]{""".replace('@@F', FENCE))

# the tagger: mark the three headings and give each its button; the click toggles a class on #projectView
one("""    /* 1225: the Admin row. Open state is per job: a different job opens closed. */
    var pv = document.getElementById('projectView');
    var pid = window.currentProject && window.currentProject.id;""",
"""    /* 1225: the Admin row. Open state is per job: a different job opens closed. */
    var pv = document.getElementById('projectView');
    var pid = window.currentProject && window.currentProject.id;
    tagFolds(mount, pv, pid);""")

one("""  var adminOpenFor = null;
  document.addEventListener('click', function(e){
    var tog = e.target.closest && e.target.closest('#acxMount > .cr-admin-tog');""",
"""  var adminOpenFor = null;
  /* 1375: Location, Assigned To and Google Reviews fold on a phone (Theo: "1 3 4"). The CSS hides them unless
     #projectView carries cr-open-<key>; this only writes the buttons, and only when one is missing or its text moved
     (a write that changes nothing still wakes every body observer). */
  var foldOpenFor = null;
  function tagFolds(mount, pv, pid){
    if(pv && foldOpenFor !== pid){ pv.classList.remove('cr-open-loc', 'cr-open-asg', 'cr-open-rv'); foldOpenFor = pid; }
    var pr = window.currentProject || {};
    var asg = mount.querySelector(':scope > .acxassignsec');
    var rep = asg && asg.querySelector('.dbrep b');
    var rows = [
      { key:'loc', title:'Location', head: mount.querySelector(':scope > [data-cr-ord="loch"]'),
        sum: pr.address ? String(pr.address).split(',')[0] : 'No address yet' },
      { key:'asg', title:'Assigned To', head: asg && asg.previousElementSibling && asg.previousElementSibling.classList.contains('projsec') ? asg.previousElementSibling : null,
        sum: rep ? rep.textContent.trim() : 'Nobody yet' },
      { key:'rv', title:'Google Reviews', head: mount.querySelector(':scope > .rvcard > .rvtop'), sum: '' }
    ];
    rows.forEach(function(r){
      if(!r.head) return;
      if(r.head.getAttribute('data-cr-fold') !== r.key) r.head.setAttribute('data-cr-fold', r.key);
      var btn = r.head.querySelector(':scope > .cr-fold');
      if(!btn){
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cr-fold';
        btn.setAttribute('data-cr-fold-key', r.key);
        btn.innerHTML = '<span class="cr-fold-s"></span>';
        r.head.appendChild(btn);
      }
      var s = btn.querySelector('.cr-fold-s');
      if(s && s.textContent !== r.sum) s.textContent = r.sum;
      var lbl = r.title + (r.sum ? ': ' + r.sum : '');
      if(btn.getAttribute('aria-label') !== lbl) btn.setAttribute('aria-label', lbl);
      var open = String(!!(pv && pv.classList.contains('cr-open-' + r.key)));
      if(btn.getAttribute('aria-expanded') !== open) btn.setAttribute('aria-expanded', open);
    });
  }
  document.addEventListener('click', function(e){
    var t = /** @type {Element} */ (e.target);
    var b = t && t.closest && t.closest('#acxMount .cr-fold');
    if(!b) return;
    var pv = document.getElementById('projectView');
    if(!pv) return;
    var cls = 'cr-open-' + b.getAttribute('data-cr-fold-key');
    var open = !pv.classList.contains(cls);
    pv.classList.toggle(cls, open);
    b.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function(e){
    var tog = e.target.closest && e.target.closest('#acxMount > .cr-admin-tog');""")

one(">v2026-10-19 build 1374<button", ">v2026-10-19 build 1375<button")
one("""  { b: 1374, d:'2026-10-19',""",
"""  { b: 1375, d:'2026-10-19', t:'A shorter client page on the phone', s:'On a phone, Location, Assigned To and Google Reviews on a client’s page are now one line each, showing the street and the rep’s name. Tap a line to open it and tap again to close it. Job Details stays open. The address is still at the top of the page, one tap from directions.' },
  { b: 1374, d:'2026-10-19',""")
pl.write_atomic(path, s)
print('ok 1375')
