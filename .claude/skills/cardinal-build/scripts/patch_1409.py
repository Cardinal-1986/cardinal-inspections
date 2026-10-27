"""Build 1409 — a lead card opens the client (27 Oct 2026, Theo: "Clicking doesn't take me inside the profile").
On a screen wider than 900px a card click only SELECTED the lead and previewed it in the side pane; the profile
opened from the pane's "Open profile" button. When that pane is not on screen (Theo's monitor showed the list and an
empty right side) the click did nothing visible. A click now opens the profile at every width, as it always did on a
phone. The pane is kept as a hover preview on a mouse: pointing at a card fills it, so nothing is lost."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(P, encoding='utf-8').read()
def one(t, old, new, n=1):
    c = t.count(old); assert c == n, (c, old[:90]); return t.replace(old, new)
s = one(s, """  var card = e.target.closest('.ljcard');
  if(!card) return;
  var id = card.getAttribute('data-lj');
  if(window.innerWidth > 900){
    ljState.sel = id;
    renderLeadsView();
  } else {
    openProject(id);
  }
});""", """  var card = e.target.closest('.ljcard');
  if(!card) return;
  /* 1409: a click opens the client at every width (it only selected on desktop, which did nothing
     visible whenever the side pane was off screen). The pane is now the hover preview, below. */
  openProject(card.getAttribute('data-lj'));
});
/* 1409: pointing at a card with a mouse previews it in the side pane (the old click-to-select) */
document.getElementById('ljList').addEventListener('mouseover', function(e){
  if(window.innerWidth <= 900 || !window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;
  var tg = /** @type {any} */ (e.target), card = tg && tg.closest && tg.closest('.ljcard');
  if(!card) return;
  var id = card.getAttribute('data-lj');
  if(ljState.sel === id) return;
  ljState.sel = id;
  document.querySelectorAll('#ljList .ljcard.sel').forEach(function(c){ c.classList.remove('sel'); });
  card.classList.add('sel');
  renderLjPane();
});""")
s = one(s, ">v2026-10-24 build 1407<", ">v2026-10-27 build 1409<")
s = one(s, """  { b: 1407, d:'2026-10-24',""",
"""  { b: 1409, d:'2026-10-27', t:'Leads open when you tap them', s:'On the Leads screen, tapping or clicking a lead now opens the client on every screen size. On a computer, pointing at a lead still shows its preview on the right.' },
  { b: 1407, d:'2026-10-24',""")
pl.write_atomic(P, s)
print('ok 1409')
