"""Build 1422 — the Ask button wears the portal's colour and is a true round button on a phone (29 Oct 2026).

Judges 15 and 16: the red Ask button "clashes with green Community" — it was the one red fill left on Community
and Insurance after 1418 gave the + the CRM identity hue. It now reads the same --crm-id / --crm-id-ink pair the +
reads (retail red, insurance teal, community emerald; the light twins flip with the theme).

And 1373's phone shape never fully won: its media rule sits ~90,000 lines BEFORE the base rule at equal
specificity, so the base's later height:48px, padding:0 18px and font-size:15px beat it — Chromium measured a 52x48
button with a 15px star. The phone rule moves to just after the base rule (deleted at source, not out-specified),
so it is the 52x52 round star 1373 drew.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)

s = one(s, """  /* the Ask button sat over the right-hand tiles: a round button with just the star */
  #cr-ai-fab{--cr-stack:"1373 a round star on a phone; the pill stays on wider screens";width:52px;height:52px;padding:0;justify-content:center;font-size:22px;}
  #cr-ai-fab .cr-ai-lbl{display:none;}
}""",
"""  /* 1422: the round Ask star moved next to its base rule in cr-ai-styles — here it lost every property it shared */
}""")

s = one(s, """  height:48px; padding:0 18px; border-radius:99px; border:0; background:var(--ai-red,#C8202E); color:#fff;
  font:inherit; font-size:15px; font-weight:800; letter-spacing:.02em; cursor:pointer; box-shadow:0 6px 20px rgba(0,0,0,.35);}""",
"""  height:48px; padding:0 18px; border-radius:99px; border:0; background:var(--crm-id,var(--ai-red,#C8202E)); color:var(--crm-id-ink,#fff);
  font:inherit; font-size:15px; font-weight:800; letter-spacing:.02em; cursor:pointer; box-shadow:0 6px 20px rgba(0,0,0,.35);}
/* 1422: the CRM's identity hue, the + button's pair (1418) — it was the one red fill left on green Community */
@media (max-width:760px){
  /* 1373: the Ask button sat over the right-hand tiles: a round button with just the star. 1422: moved here,
     after the base rule — ~90,000 lines earlier it lost height, padding and font-size to it (measured 52x48, 15px). */
  #cr-ai-fab{--cr-stack:"1373 a round star on a phone; the pill stays on wider screens";width:52px;height:52px;padding:0;justify-content:center;font-size:22px;}
  #cr-ai-fab .cr-ai-lbl{display:none;}
}""")

s = one(s, ">v2026-10-29 build 1421<", ">v2026-10-29 build 1422<")
s = one(s, """  { b: 1421, d:'2026-10-29',""",
"""  { b: 1422, d:'2026-10-29', t:'The Ask button wears the portal colour', s:'The Ask button is red on Retail, teal on Insurance and green on Community \\u2014 the same as the + button \\u2014 instead of red everywhere. On a phone it is a proper round button with a larger star.' },
  { b: 1421, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1422')
