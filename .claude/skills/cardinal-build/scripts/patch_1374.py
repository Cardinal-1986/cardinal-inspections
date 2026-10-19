"""Build 1374 — the address in the client band (Theo, 19 Oct: "It would be really nice to see the address and tap it
without having to scroll or make a call, email, text etc").
On a phone the band at the top of a retail client's page already carried Email / Text / Call. The address lived only in
the Location card, below the stage bar, the Job Menu and the money. It is now a line of its own across the band, under
the name: one tap opens directions (mapsUrl: Apple Maps on iOS, Google elsewhere), the same link the Location card uses.
Drawn only when the job has an address. Everything is inside the band's existing <=560px media query, so the desktop is
unchanged."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# the pin, beside the band's other three drawn icons
one("""    mail : "<path d='M3.4 6.6h17.2v10.8H3.4z'/><path d='m3.9 7.2 8.1 5.6 8.1-5.6'/>",""",
    """    mail : "<path d='M3.4 6.6h17.2v10.8H3.4z'/><path d='m3.9 7.2 8.1 5.6 8.1-5.6'/>",
    pin  : "<path d='M12 21s-6.6-6-6.6-11.1a6.6 6.6 0 0 1 13.2 0C18.6 15 12 21 12 21z'/><circle cx='12' cy='9.9' r='2.4'/>",   /* 1374 */""")

# the line itself, after the contact icons and before the panel they open
one("""      (acts ? '<span class="nb-r">' + acts + '</span>' : '') +
      '<div class="nb-pop" data-cr-pop hidden>' +""",
    """      (acts ? '<span class="nb-r">' + acts + '</span>' : '') +
      /* 1374: the address, one tap to directions — the Location card's own link, without the scroll */
      (pr.address ? '<a class="nb-addr" data-cr-nbaddr href="' + esc(typeof mapsUrl === 'function' ? mapsUrl(pr.address)
          : 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(pr.address)) +
        '" target="_blank" rel="noopener" aria-label="Directions to ' + esc(pr.address) + '">' + svg('pin') +
        '<span class="nb-addr-t">' + esc(pr.address) + '</span></a>' : '') +
      '<div class="nb-pop" data-cr-pop hidden>' +""")

one("""  #cr-namebar .nb-ico svg{ width:19px; height:19px; }
""",
    """  #cr-namebar .nb-ico svg{ width:19px; height:19px; }
  /* 1374: the address across the band, under the name. One line; a long one ends in an ellipsis, the full
     address is in the link's label and in the Location card. 44px tall so it is a real tap target. */
  #cr-namebar .nb-addr{
    flex:1 0 100%; min-width:0; min-height:44px; margin:4px 0 -6px;
    display:flex; align-items:center; gap:8px; text-decoration:none;
    font:600 15px 'Segoe UI',Arial,sans-serif; color:var(--rbe-head,#fff);
  }
  #cr-namebar .nb-addr svg{ width:18px; height:18px; flex:none; color:var(--rbe-acclt,#b9d3ec); }
  #cr-namebar .nb-addr-t{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
""")

one(">v2026-10-18 build 1373<button", ">v2026-10-19 build 1374<button")
one("""  { b: 1373, d:'2026-10-18',""",
"""  { b: 1374, d:'2026-10-19', t:'The address at the top of the client page', s:'On a phone, the band at the top of a client’s page now shows the address under the name, beside the Email, Text and Call buttons. Tap it and directions open, the same as the map in the Location card, so you no longer scroll down to find it.' },
  { b: 1373, d:'2026-10-18',""")
pl.write_atomic(path, s)
print('ok 1374')
