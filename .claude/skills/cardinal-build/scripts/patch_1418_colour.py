#!/usr/bin/env python3
"""patch_1418_colour.py <file> — Build 1418, step 1 of 2: judge 16 (colour / text / identity) fixes.

Applies every edit with an asserted count (patch_lib.sub), in file order of
dependence, then writes atomically. Does NOT touch the app stamp or the
CHANGELOG. Re-running on a fresh copy of b1415 reproduces the output byte for
byte (pure literal splicing, no time or randomness).
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

PATH = sys.argv[1]
src = pl.load(PATH)
ORIG = src
EDITS = []


def E(old, new, count=1, label=''):
    EDITS.append((label, old, new, count, None))


def B(block, old, new, count=1, label=''):
    """Edit inside ONE <style id=block> / <script id=block> only: the anchor is
    asserted unique within that block, and the block itself must exist once."""
    EDITS.append((label, old, new, count, block))


def apply_block(src, block, old, new, count):
    for tag in ('style', 'script'):
        opener = '<%s id="%s">' % (tag, block)
        if src.count(opener) == 1:
            i = src.index(opener)
            j = src.index('</%s>' % tag, i)
            seg = pl.sub(src[i:j], old, new, count)
            return src[:i] + seg + src[j:]
    raise pl.PatchError('block %r not found exactly once' % block)


# ════════════════════════════════════════════════════════════════════════════
# S1 — Insurance follows the app theme.
#   cur() derives docket/siren from `cardinal.theme.rb` when `cardinalRLTheme`
#   is unset; the one header/drawer toggle writes BOTH keys. The Resource
#   Library's saved() and its 600ms body re-stamp delegate to the same cur(),
#   so three readers cannot disagree about one attribute.
# ════════════════════════════════════════════════════════════════════════════
E("""  function cur(){
    try { return localStorage.getItem(KEY) === 'siren' ? 'siren' : 'docket'; }
    catch(e){ return 'docket'; }
  }""",
"""  /* 1418 J16 (judge 16, MAJOR 1): with the key UNSET this read 'docket' — white paper
     — while the app around it was dark, so Insurance was the one portal that did
     not follow the theme. An explicit choice still wins; with none, the app
     theme decides (cardinal.theme.rb '1' = light = docket, else siren). The
     catch mirrors the app's own: if storage throws the app is dark, so siren. */
  function cur(){
    try {
      var v = localStorage.getItem(KEY);
      if (v === 'siren' || v === 'docket') return v;
      return localStorage.getItem('cardinal.theme.rb') === '1' ? 'docket' : 'siren';
    }
    catch(e){ return 'siren'; }
  }""", label='S1 cur() derives from the app theme')

E("""  function saved(){
    try{ return localStorage.getItem(KEY)||'docket'; }catch(e){ return 'docket'; }
  }""",
"""  /* J16: the library and Insurance share <body data-rltheme>, so they must read
     ONE answer. Delegates to cr-instheme's cur() (parsed before this boots, at
     DOMContentLoaded); the fallback is the same two-key rule. */
  function saved(){
    try{ if(window.CardinalInsTheme && typeof window.CardinalInsTheme.get === 'function') return window.CardinalInsTheme.get(); }catch(e){}
    try{ var v = localStorage.getItem(KEY); if(v === 'siren' || v === 'docket') return v;
         return localStorage.getItem('cardinal.theme.rb') === '1' ? 'docket' : 'siren'; }catch(e){ return 'siren'; }
  }""", label='S1 RL saved() delegates')

E("""      var appTh = 'docket';
      try{ if(localStorage.getItem('cardinalRLTheme') === 'siren') appTh = 'siren'; }catch(e){}""",
"""      /* J16: the same answer cr-instheme gives (it derives from the app theme
         when the key is unset); re-reading only the key here would re-stamp
         docket every 600ms and undo it. */
      var appTh = 'docket';
      try{ appTh = (window.CardinalInsTheme && window.CardinalInsTheme.get) ? window.CardinalInsTheme.get()
                 : (localStorage.getItem('cardinalRLTheme') === 'siren' ? 'siren' : 'docket'); }catch(e){}""",
  label='S1 library re-stamp delegates')

E("""    try{ localStorage.setItem('cardinalRLTheme', next); }catch(e){}
    window.CardinalInsTheme.apply(next);
    apply();
    return;
  }
  setLight(!isLight());
}""",
"""    try{ localStorage.setItem('cardinalRLTheme', next); }catch(e){}
    /* J16: ONE toggle, BOTH keys — the app theme follows the insurance flip, so
       walking back to Retail does not land on the other theme. */
    try{ localStorage.setItem(KEY, next === 'docket' ? '1' : '0'); }catch(e){}
    window.CardinalInsTheme.apply(next);
    apply();
    return;
  }
  setLight(!isLight());
  /* J16: and the insurance palette follows the app flip (both keys written). */
  var insNext = isLight() ? 'docket' : 'siren';
  try{ localStorage.setItem('cardinalRLTheme', insNext); }catch(e){}
  try{ if(window.CardinalInsTheme && window.CardinalInsTheme.apply) window.CardinalInsTheme.apply(insNext); }catch(e){}
}""", label='S1 toggle writes both keys')


# ════════════════════════════════════════════════════════════════════════════
# S2 — the siren surfaces that become the default once Insurance follows a dark
#      app: the claim card, the money ring and Balance Due, the @mention chips.
# ════════════════════════════════════════════════════════════════════════════
XL = 'cr-xlinks-styles'
B(XL, """  .cr-xl-card {
    display: block;
    background: #fff;
    border: 1px solid #e5e5e5;""", """  .cr-xl-card {
    display: block;
    background: var(--xl-card, #fff);
    border: 1px solid var(--xl-bd, #e5e5e5);""", label='S2 xl card ground')
B(XL, """    text-decoration: none;
    color: #2a2a2a;
    cursor: pointer;""", """    text-decoration: none;
    color: var(--xl-ink, #2a2a2a);
    cursor: pointer;""", label='S2 xl card ink')
B(XL, """  .cr-xl-card.suggest { border-left-color: #C87A00; background: #FEF9F0; }
  .cr-xl-card.linked-est { border-left-color: #1976D2; background: #F5FAFE; }
  .cr-xl-card.linked-contract { border-left-color: #2E7D32; background: #F5FAF5; }""",
"""  .cr-xl-card.suggest { border-left-color: #C87A00; background: var(--xl-suggest, #FEF9F0); }
  .cr-xl-card.linked-est { border-left-color: #1976D2; background: var(--xl-est, #F5FAFE); }
  .cr-xl-card.linked-contract { border-left-color: #2E7D32; background: var(--xl-ct, #F5FAF5); }""", label='S2 xl variants')
B(XL, """    text-transform: uppercase;
    color: #D9282A;
  }
  .cr-xl-card.suggest .cr-xl-eyebrow { color: #C87A00; }
  .cr-xl-card.linked-est .cr-xl-eyebrow { color: #1976D2; }
  .cr-xl-card.linked-contract .cr-xl-eyebrow { color: #2E7D32; }""",
"""    text-transform: uppercase;
    color: var(--xl-red, #D9282A);
  }
  /* J16: #C87A00 was 3.21:1 and #1976D2 4.38:1 on their own tinted cards (11px) */
  .cr-xl-card.suggest .cr-xl-eyebrow { color: var(--xl-warn, #8a5a00); }
  .cr-xl-card.linked-est .cr-xl-eyebrow { color: var(--xl-info, #1565c0); }
  .cr-xl-card.linked-contract .cr-xl-eyebrow { color: var(--xl-ok, #256b29); }""", label='S2 xl eyebrows')
B(XL, """    border-radius: 8px;
    background: #f5f5f5;
    color: #666;
  }
  .cr-xl-status.approved,
  .cr-xl-status.completed,
  .cr-xl-status.signed { background: #E7F2E7; color: #2E7D32; }
  .cr-xl-status.in_progress,
  .cr-xl-status.sent { background: #E3F0FB; color: #1976D2; }
  .cr-xl-status.filed,
  .cr-xl-status.draft { background: #f5f5f5; color: #666; }
  .cr-xl-status.awaiting_rcv,
  .cr-xl-status.adjuster_pending { background: #FBEFDA; color: #C87A00; }
  .cr-xl-status.denied,
  .cr-xl-status.void { background: #FDECEC; color: #D9282A; }""",
"""    border-radius: 8px;
    background: var(--xl-mute-bg, #f5f5f5);
    color: var(--xl-mute, #666);
  }
  /* J16: four of these five inks sat under 4.5:1 on their own chip at 11px —
     approved 4.46, sent 3.97, awaiting 2.96, denied 4.29. Same hues, deepened:
     5.68 / 4.96 / 5.21 / 5.78. Siren repaints them through the tokens below. */
  .cr-xl-status.approved,
  .cr-xl-status.completed,
  .cr-xl-status.signed { background: var(--xl-ok-bg, #E7F2E7); color: var(--xl-ok, #256b29); }
  .cr-xl-status.in_progress,
  .cr-xl-status.sent { background: var(--xl-info-bg, #E3F0FB); color: var(--xl-info, #1565c0); }
  .cr-xl-status.filed,
  .cr-xl-status.draft { background: var(--xl-mute-bg, #f5f5f5); color: var(--xl-mute, #666); }
  .cr-xl-status.awaiting_rcv,
  .cr-xl-status.adjuster_pending { background: var(--xl-warn-bg, #FBEFDA); color: var(--xl-warn, #8a5a00); }
  .cr-xl-status.denied,
  .cr-xl-status.void { background: var(--xl-bad-bg, #FDECEC); color: var(--xl-bad, #b71c1c); }""", label='S2 xl status chips')
B(XL, """    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: -0.3px;
    margin-bottom: 4px;
  }
  .cr-xl-sub {
    font-size: 13px;
    color: #6b6b6b;""", """    font-weight: 700;
    color: var(--xl-title, #1a1a1a);
    letter-spacing: -0.3px;
    margin-bottom: 4px;
  }
  .cr-xl-sub {
    font-size: 13px;
    color: var(--xl-sub, #6b6b6b);""", label='S2 xl title/sub')
B(XL, """    font-size: 13px;
    color: #6b6b6b;
    letter-spacing: 0.3px;
  }
  .cr-xl-financials .num {
    font-weight: 700;
    color: #1a1a1a;""", """    font-size: 13px;
    color: var(--xl-sub, #6b6b6b);
    letter-spacing: 0.3px;
  }
  .cr-xl-financials .num {
    font-weight: 700;
    color: var(--xl-title, #1a1a1a);""", label='S2 xl financials')
B(XL, """  .cr-xl-financials .pct {
    font-weight: 700;
    color: #2E7D32;""", """  .cr-xl-financials .pct {
    font-weight: 700;
    color: var(--xl-pct, #2E7D32);""", label='S2 xl pct')
B(XL, """    height: 3px;
    background: #efefef;""", """    height: 3px;
    background: var(--xl-track, #efefef);""", label='S2 xl track')
B(XL, """    text-transform: uppercase;
    color: #D9282A;
    margin-top: 8px;
  }""", """    text-transform: uppercase;
    color: var(--xl-red, #D9282A);
    margin-top: 8px;
  }""", label='S2 xl cta')
B(XL, """  .cr-xl-link-existing {
    display: inline-block;
    color: #6b6b6b;""", """  .cr-xl-link-existing {
    display: inline-block;
    color: var(--xl-sub, #6b6b6b);""", label='S2 xl link-existing')
B(XL, """  .cr-xl-picker-btn { padding: 10px 18px; border-radius: 4px; font-size: 13px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; cursor: pointer; font-family: inherit; border: 1px solid #e5e5e5; background: white; color: #2a2a2a; }
""", """  .cr-xl-picker-btn { padding: 10px 18px; border-radius: 4px; font-size: 13px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; cursor: pointer; font-family: inherit; border: 1px solid #e5e5e5; background: white; color: #2a2a2a; }

  /* J16 (judge 16, MAJOR 2): the claim card was #ffffff in Siren too — a white
     island on the dark insurance profile. Siren now supplies the card's tokens;
     Docket supplies none, so light is the fallbacks above, untouched. Every ink
     was computed on the card's own ground (#1E1E24): title 14.77, sub 6.46,
     eyebrow/cta 4.72, pct 9.55; chips on their 22% tints 7.0-7.7. */
  body[data-rltheme="siren"] .cr-xl-card {
    --xl-card: #1E1E24; --xl-bd: #34343B; --xl-ink: #F4F1F1; --xl-title: #F4F1F1; --xl-sub: #A8A09E;
    --xl-red: #e35c63; --xl-pct: #7FD79A; --xl-track: #34343B;
    --xl-suggest: #1E1E24; --xl-est: #1E1E24; --xl-ct: #1E1E24;
    --xl-ok: #7FD79A; --xl-ok-bg: rgba(46,125,50,.22);
    --xl-info: #8cc2f5; --xl-info-bg: rgba(25,118,210,.22);
    --xl-mute: #c9c4c2; --xl-mute-bg: rgba(255,255,255,.08);
    --xl-warn: #f5c46b; --xl-warn-bg: rgba(200,122,0,.22);
    --xl-bad: #ff9e9e; --xl-bad-bg: rgba(217,40,42,.22);
  }
  body[data-rltheme="siren"] .cr-xl-card:hover { box-shadow: 0 2px 10px rgba(0,0,0,.45); }
""", label='S2 xl siren tokens')

# the money ring: the hole was a WHITE disc in both insurance themes, and Siren's
# amber ink (--ct-warn #F5C518) measured 1.63:1 on it. The hole takes the card's
# own surface token instead — #FFFFFF in Docket (unchanged), #16161B in Siren (11.06).
E("body.claim-insurance .dbmoney .dbringin{color:var(--ct-warn);}",
  "body.claim-insurance .dbmoney .dbringin{color:var(--ct-warn);background:var(--ct-surface,#ffffff);}  /* J16: the hole follows the card (Siren 1.63 -> 11.06) */",
  label='S2 ring hole')
# Balance Due: the declared-pair shape db-paid already uses one line above.
E("""body[data-rltheme="siren"].claim-insurance #projectView .dbmoney b.db-paid{color:#7CB342;}
""", """body[data-rltheme="siren"].claim-insurance #projectView .dbmoney b.db-paid{color:#7CB342;}
/* J16: and its twin — Cardinal red is 3.18:1 on Siren's card; the app's lighter cardinal is 5.13. */
body[data-rltheme="siren"].claim-insurance #projectView .dbmoney b.db-due{color:#e35c63;--cr-stack:"siren twin of the base db-due red; Docket keeps #C8202E";}
""", label='S2 db-due siren')

# the @mention chips: 1326 pinned them to the cream chat box's dark ink in every
# CRM. On insurance the box is var(--ct-surface) — #16161B in Siren — so the pin
# printed #5c4a42 at 2.16:1. Insurance already has a token rule for these chips
# (cr-layout-fixes, #commsView .chipbtn); the pin now stands aside for it.
E("""#commsView #chatTagRow .chipbtn{--cr-stack:"1326 chips on the cream chat box need its dark ink in both themes";
  color:#5c4a42;border-color:#8a7c76;background:transparent;}
#commsView #chatTagRow .chipbtn:hover{color:#9c1822;border-color:#C8202E;}""",
"""body:not(.claim-insurance) #commsView #chatTagRow .chipbtn{--cr-stack:"1326 chips on the cream chat box need its dark ink in both themes";
  color:#5c4a42;border-color:#8a7c76;background:transparent;}
body:not(.claim-insurance) #commsView #chatTagRow .chipbtn:hover{color:#9c1822;border-color:#C8202E;}""", label='S2 chat chips stand aside on insurance')
# and the empty-thread line on that cream box was 3.05:1 (#9a8c85 on #faf7f5).
E(""".chatempty{font:13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#9a8c85;padding:8px 2px;}""",
  """.chatempty{font:13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#6e625c;padding:8px 2px;}/* J16: was #9a8c85, 3.05:1 on the cream box; 5.52 */""",
  label='S2 chatempty ink')

# 1417 (comms) added a read-only claim-note tag and a "will notify" line, both
# inked for the cream chat box. On insurance that box is var(--ct-surface), and
# Siren is now the dark-app default: the tag measured 2.31:1 there (gate_1417 K),
# the line 3.21 and its warning red 2.20. Insurance's own chat block already
# re-inks every other element from --ct-*; these three join it. On a base without
# 1417 they match nothing and do nothing.
E("""body.claim-insurance #commsView .chatmsg .when,
body.claim-insurance #commsView .chatempty{ color:var(--ct-ink-2,#6E6663); }
""", """body.claim-insurance #commsView .chatmsg .when,
body.claim-insurance #commsView .chatempty{ color:var(--ct-ink-2,#6E6663); }
body.claim-insurance #commsView .chatmsg .chattag{ color:var(--ct-ink-2,#6E6663); border-color:var(--ct-line-strong,#DED8D6); --cr-stack:"J16 insurance twin of 1417's cream-box ink: 2.31 -> 7.51 in Siren, 5.30 in Docket"; }
body.claim-insurance #commsView .chatwill{ color:var(--ct-ink-2,#6E6663); --cr-stack:"J16 insurance twin: 3.21 -> 7.03 in Siren"; }
body.claim-insurance #commsView .chatwill.warn{ color:var(--ct-red-deep,#7E1410); --cr-stack:"J16 insurance twin: 2.20 -> 5.08 in Siren, 10.5 in Docket"; }
""", label='S2 insurance chat tag + will-notify inks (1417 surfaces)')

# the map placeholder (shown when no map image loads) is cream in every theme;
# the dark card inks printed on it at 1.52 (Community) and 2.09 (Siren). Its
# ground now follows the card where the card is dark — a token, so retail
# (which already repaints .dbmap for dark) and every light theme are untouched.
E(""".dbmap{height:172px;border-radius:8px;overflow:hidden;background:#ece7e2;position:relative;z-index:0;}""",
  """.dbmap{height:172px;border-radius:8px;overflow:hidden;background:var(--dbmap-bg,#ece7e2);position:relative;z-index:0;}
/* J16: the placeholder ground follows a dark card (Siren insurance; Community in the dark app). */
body[data-rltheme="siren"].claim-insurance{--dbmap-bg:#0E0E12;}
:root:not([data-theme="rb-light"]) body.claim-community{--dbmap-bg:#101312;}""", label='S2 map placeholder ground')

# ════════════════════════════════════════════════════════════════════════════
# S3 — white / cream islands in the dark app. Dark values in the base (the app
#      default), the original light values restored under rb-light.
#      ⚠ #projModal (.projform) and the estimate builder's paper cards are NOT
#      here on purpose: both are SETTLED (Forms 1, 6 Oct; 1217 pick (b)).
# ════════════════════════════════════════════════════════════════════════════
E(""".hstat{font:700 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;background:#f3ecea;color:#7a4a3e;
  border:1px solid #e0d2cc;border-radius:12px;padding:5px 12px;cursor:pointer;}
.hstat:hover{background:#eaddd8;}
.hstat b{color:var(--red-dk);}""",
""".hstat{font:700 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;background:#22262d;color:#c2cbd8;
  border:1px solid #3a3f47;border-radius:12px;padding:5px 12px;cursor:pointer;}
.hstat:hover{background:#2a2f37;}
.hstat b{color:#f08a90;}
/* J16 (judge 16, MAJOR 2): these chips were cream (#f3ecea / #7a4a3e) on the dark
   Reports card and the dark profile. Dark first, the shipped light values back
   under rb-light. Dark: label 9.27, count 6.32 on #22262d. */
:root[data-theme="rb-light"] .hstat{background:#f3ecea;color:#7a4a3e;border-color:#e0d2cc;}
:root[data-theme="rb-light"] .hstat:hover{background:#eaddd8;}
:root[data-theme="rb-light"] .hstat b{color:var(--red-dk);}""", label='S3 hstat dark-first')
E(""".rptchips .hstat{cursor:pointer;}""",
  """.rptchips .hstat{cursor:pointer;}
/* J16: the selected range / tab never looked selected (Month and Company carry .on). */
.rptchips .hstat.on,.rptchips .hstat.on:hover{background:#c8202e;color:#ffffff;border-color:#c8202e;}
.rptchips .hstat.on b{color:#ffffff;}""", label='S3 reports chip selected state')
E(""".tchip.trade{background:#f3ecea;color:#7a4a3e;border:1px solid #e0d2cc;}
.tchip.insp{background:#e8f0fb;color:#1d4f91;border:1px solid #c9dbf2;}
.tchip.est{background:#e9f5ec;color:#1d6b34;border:1px solid #c8e5cf;}""",
""".tchip.trade{background:rgba(240,138,144,.12);color:#f0b8b3;border:1px solid rgba(240,138,144,.35);}
.tchip.insp{background:rgba(91,140,200,.16);color:#9cc3f0;border:1px solid rgba(91,140,200,.40);}
.tchip.est{background:rgba(52,168,83,.16);color:#8fd6a5;border:1px solid rgba(52,168,83,.40);}
/* J16: the Contract / Invoice / Estimate / trade chips were pastel cards on the
   dark document rows. Dark: the hue at a low alpha, the ink lightened (8.0-8.8:1
   on #15151b). Light: exactly what shipped. */
:root[data-theme="rb-light"] .tchip.trade{background:#f3ecea;color:#7a4a3e;border-color:#e0d2cc;}
:root[data-theme="rb-light"] .tchip.insp{background:#e8f0fb;color:#1d4f91;border-color:#c9dbf2;}
:root[data-theme="rb-light"] .tchip.est{background:#e9f5ec;color:#1d6b34;border-color:#c8e5cf;}""", label='S3 tchip dark-first')
E(""".crar-pill.draft{color:#475569;background:#EEF2F7;}
.crar-pill.sent{color:#1D4ED8;background:#E7EFFD;}
.crar-pill.part{color:#B45309;background:#FDF1E2;}
.crar-pill.paid{color:#047857;background:#E4F5EE;}
.crar-pill.over{color:#B91C1C;background:#FCEAEA;}""",
""".crar-pill.draft{color:#c2cbd8;background:rgba(148,163,184,.14);}
.crar-pill.sent{color:#a5c0ff;background:rgba(29,78,216,.24);}
.crar-pill.part{color:#f5b971;background:rgba(180,83,9,.24);}
.crar-pill.paid{color:#6ee7b7;background:rgba(4,120,87,.24);}
.crar-pill.over{color:#fca5a5;background:rgba(185,28,28,.24);}
/* J16: the cream "Deposit Paid" pill on the dark job card. Status hue at a low
   alpha, the ink lightened: 8.3-9.5:1 on the card (#141619). Light: as shipped.
   The AR dashboard's own #cr-ar-view .crar-pill rules are untouched and still win there. */
:root[data-theme="rb-light"] .crar-pill.draft{color:#475569;background:#EEF2F7;}
:root[data-theme="rb-light"] .crar-pill.sent{color:#1D4ED8;background:#E7EFFD;}
:root[data-theme="rb-light"] .crar-pill.part{color:#B45309;background:#FDF1E2;}
:root[data-theme="rb-light"] .crar-pill.paid{color:#047857;background:#E4F5EE;}
:root[data-theme="rb-light"] .crar-pill.over{color:#B91C1C;background:#FCEAEA;}""", label='S3 crar-pill dark-first')

# ════════════════════════════════════════════════════════════════════════════
# S4 — measured sub-floor inks and sub-11px text (judge 16 MAJOR 4-5, MINOR 8-12)
# ════════════════════════════════════════════════════════════════════════════
# MAJOR 4 — the dark home history controls. Tokens with the DARK value as the
# fallback (the app default) and the shipped light value set under rb-light.
E(""".cr-csv-btn{min-height:44px;background:transparent;border:1px solid #c8202e;color:#8f1620;""",
  """.cr-csv-btn{min-height:44px;background:transparent;border:1px solid var(--csv-bd,#e35c63);color:var(--csv-ink,#e35c63);""",
  label='S4 csv ink dark-first')
E(""".cr-csv-btn:hover{background:rgba(200,32,46,.14)}</style>""",
  """.cr-csv-btn:hover{background:rgba(200,32,46,.14)}
/* J16: #8f1620 was 2.18:1 on the dark page; dark #e35c63 5.66, light keeps #8f1620 / #c8202e. */
:root[data-theme="rb-light"]{--csv-bd:#c8202e;--csv-ink:#8f1620;}</style>""", label='S4 csv light token')
E("""#cr-bulk-toggle{min-height:44px;background:transparent;border:1px solid #4a6fa5;color:#4a6fa5;""",
  """#cr-bulk-toggle{min-height:44px;background:transparent;border:1px solid var(--blk-ink,#8ab4e0);color:var(--blk-ink,#8ab4e0);""",
  label='S4 bulk ink dark-first')
E("""#cr-bulk-toggle:hover{background:rgba(74,111,165,.12)}""",
  """#cr-bulk-toggle:hover{background:rgba(74,111,165,.12)}:root[data-theme="rb-light"]{--blk-ink:#4a6fa5;}/* J16: #4a6fa5 was 3.89:1 on the dark page; dark #8ab4e0 9.17 */""",
  label='S4 bulk light token')
E("""text-transform:uppercase;color:#6b6b6b;white-space:nowrap}#cr-rf-sel{""",
  """text-transform:uppercase;color:var(--rf-lbl,#9aa0a8);white-space:nowrap}#cr-rf-sel{""", label='S4 Assigned label dark-first')
E("""#cr-rf-count{font:700 11px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#8f1620;white-space:nowrap}""",
  """#cr-rf-count{font:700 11px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--rf-cnt,#e35c63);white-space:nowrap}:root[data-theme="rb-light"]{--rf-lbl:#6b6b6b;--rf-cnt:#8f1620;}/* J16: "Assigned" #6b6b6b was 3.73:1 dark -> #9aa0a8 7.55; its count #8f1620 -> #e35c63 */""",
  label='S4 Assigned count + light tokens')
E(""":root:not([data-theme="rb-light"]) .listctl{color:#c7b3ac;}
""", """:root:not([data-theme="rb-light"]) .listctl{color:#c7b3ac;}
/* J16: "1 retail project" reads .count's light-era --muted, #5c5c5c — 2.97:1 here. */
:root:not([data-theme="rb-light"]) .controls #countLabel{color:#9aa0a8;--cr-stack:"dark twin of .count (--muted is a light-era ink); light keeps it";}
""", label='S4 countLabel dark twin')

# MINOR 8 — white initials on the avatar hues. Four of seven failed (the yellow
# at 2.0:1, #7CB342 2.50). Same hue order, so each person keeps their colour;
# every one is deepened until white clears 4.5 (4.82-6.03).
E("""var AV_COLORS = ['#C8202E','#E8B10F','#7CB342','#29A3DC','#8E6BC1','#F08A24','#607D8B'];""",
  """/* J16: deepened so white initials clear 4.5:1 — was #E8B10F 2.0, #7CB342 2.50, #29A3DC 2.9,
   #F08A24 2.6, #8E6BC1 4.2, #607D8B 4.4. Same order, so nobody changes colour family. */
var AV_COLORS = ['#C8202E','#8a6a00','#4e7d23','#1a6f9a','#7451a8','#b4500d','#546e7a'];""", label='S4 avatar hues')

# MINOR 10 — light team calendar: other-month days #d3c3c1 on #fdf9f9, 1.63:1.
E(""":root[data-theme="rb-light"] .teamcal .minical .calgrid .day.other{
  border-color:#f6ebea;background:#fdf9f9;color:#d3c3c1;}""",
  """:root[data-theme="rb-light"] .teamcal .minical .calgrid .day.other{
  border-color:#f6ebea;background:#fdf9f9;color:#7a6e69;}/* J16: was #d3c3c1, 1.63:1 -> 4.71 (still visibly quieter than #2a1c1c) */""",
  label='S4 light other-month days')

# MINOR 11 — the obsidian tiles' orange money. Light #C25A18 is 3.79:1 at the
# phone's 18px (under the 18.66px-bold large-text line); dark #E8722A 4.47.
E(""":root[data-theme="rb-light"] .actbox b{color:#C25A18;}""",
  """:root[data-theme="rb-light"] .actbox b{color:#a64a10;}/* J16: was #C25A18, 3.79:1 at 18px -> 5.01; the same orange, deeper (the 557 rule) */""",
  label='S4 light tile money')
E(""".actbox b{display:block;font:800 22px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#E8722A;margin-top:3px;}""",
  """.actbox b{display:block;font:800 22px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#EC7A33;margin-top:3px;}/* J16: was #E8722A, 4.47:1 at the phone's 18px -> 4.82 */""",
  label='S4 dark tile money')

# MINOR 12 — the client list's stage chip in dark: Invoiced #8E6BC1 4.04:1 and
# Closed #607D8B 3.86:1 as TEXT. The hue stays on the border; the ink takes a
# lighter twin (--scd) only where the stage colour fails.
E("""border:1px solid var(--sc,#4a4d52);color:var(--sc,#b5ad9e);}
.cd-tch{""", """border:1px solid var(--sc,#4a4d52);color:var(--scd,var(--sc,#b5ad9e));}
.cd-tch{""", label='S4 cd-stchip dark ink token')
E("""'" style="--cc:' + meta.color + ';--ccl:' + (meta.colorLight || meta.color) + ';--sc:' + sc + ';--scl:' + stageInk(stg) + '">' +""",
  """'" style="--cc:' + meta.color + ';--ccl:' + (meta.colorLight || meta.color) + ';--sc:' + sc + ';--scd:' + (({ Invoiced:'#a98bec', Closed:'#8fa3ad' })[stg] || sc) + ';--scl:' + stageInk(stg) + '">' +""",
  label='S4 cd-stchip dark ink twin (J16: 4.04 -> 6.11, 3.86 -> 6.44)')

# MAJOR 5 — the editor's two <small>s inherited `smaller`: 9.17px and 10.83px.
E(""".edchip small{color:#e8b7ba;font-weight:800;}""",
  """.edchip small{color:#e8b7ba;font-weight:800;font-size:11px;}/* J16: was the UA's `smaller`, 9.17px */""", label='S4 edchip small 11px')
E(""".toolbar .statuswrap small{color:#bbb;}""",
  """.toolbar .statuswrap small{color:#bbb;font-size:11px;}/* J16: was the UA's `smaller`, 10.83px */""", label='S4 sent-date small 11px')

# found by the sweep, not the judge: the light pipeline badge initial, 4.48:1 at 18px
E(""":root[data-theme="rb-light"] .pcbadge .pcini,
:root[data-theme="rb-light"] .pcbadge .pcacts a{
  background:linear-gradient(180deg,#ffffff,#f2f3f6);
  border:1px solid #d5d8dd;
  box-shadow:0 1px 2px rgba(16,18,24,.10), 0 1px 0 rgba(255,255,255,.9) inset;
}""", """:root[data-theme="rb-light"] .pcbadge .pcini,
:root[data-theme="rb-light"] .pcbadge .pcacts a{
  background:linear-gradient(180deg,#ffffff,#f2f3f6);
  border:1px solid #d5d8dd;
  box-shadow:0 1px 2px rgba(16,18,24,.10), 0 1px 0 rgba(255,255,255,.9) inset;
}
:root[data-theme="rb-light"] .pcbadge .pcini{color:#46688a;--cr-stack:"light twin: --rbe-acclt is 4.48:1 on this tile at 18px; dark keeps the token";}""",
  label='S4 light badge initial')

# ════════════════════════════════════════════════════════════════════════════
# S5 — ONE identity hue per CRM (judge 16 MINOR 13-14): Retail #c8202e,
#      Insurance #2dd4bf, Community #34d399 — on a light ground the same hue
#      deepened (#0f766e / #047857), never a swap (the 557 rule). Four markers:
#      the portal pill dot, the client-list name, the rail segment, the header +.
#      Insurance's own red ACTION buttons are not identity markers and stay.
#      ⚠ The rail segment reverses Theo's 952 call (retail slate / insurance red)
#      for the SEGMENT ONLY; the rest of the 952 rail palette is untouched.
# ════════════════════════════════════════════════════════════════════════════
E("""    <b data-crm-go="community"><i style="background:#8ad0f5"></i>Community</b>""",
  """    <b data-crm-go="community"><i style="background:#34d399"></i>Community</b>""", label='S5 pill dot community')
E("""  { k:'community', label:'Community', dot:'#8ad0f5' }""",
  """  { k:'community', label:'Community', dot:'#34d399' }   /* J16: the one Community hue (was a light blue) */""", label='S5 photo chip dot community')
E("""  { key:'retail',    label:'Retail',    color:'#c9a227', colorLight:'#8a6a12' },
  { key:'insurance', label:'Claims',    color:'#4db8a8', colorLight:'#1f7a6b' },
  { key:'community', label:'Community', color:'#8fb4d8', colorLight:'#2f6491' }""",
  """  /* J16: one identity hue per CRM (was gold / a second teal / light blue). As TEXT
     on the dark card: #ef6b6b 5.62 (the rail's own text-safe cardinal), #2dd4bf
     9.07, #34d399 8.79. On white: #c8202e 5.67, #0f766e 5.47, #047857 5.48. */
  { key:'retail',    label:'Retail',    color:'#ef6b6b', colorLight:'#c8202e' },
  { key:'insurance', label:'Claims',    color:'#2dd4bf', colorLight:'#0f766e' },
  { key:'community', label:'Community', color:'#34d399', colorLight:'#047857' }""", label='S5 client-list CRM hues')
E("""h.style.setProperty('--lnav-on', ({ community:'#062b1f', production:'#1a1205', sales:'#1a1205' })[crm] || '#fff');
""", """h.style.setProperty('--lnav-on', ({ community:'#062b1f', production:'#1a1205', sales:'#1a1205' })[crm] || '#fff');
/* J16: the Retail | Insurance | Community SEGMENT wears the active CRM's identity
   hue (dark: fill, ink; light: fill, ink). Portals with no identity hue keep
   exactly what they had (--lnav-crmc / --lnav-on). White on #c8202e 5.67, ink on
   #2dd4bf 9.18, on #34d399 7.96; light white on #0f766e 5.47, on #047857 5.48. */
var SEG16 = ({ retail:['#c8202e','#ffffff','#c8202e','#ffffff'],
               insurance:['#2dd4bf','#04201c','#0f766e','#ffffff'],
               community:['#34D399','#062b1f','#047857','#ffffff'] })[crm] || null;
h.style.setProperty('--lnav-seg', SEG16 ? SEG16[0] : (CRM_COLOR[crm] || CRM_COLOR.retail));
h.style.setProperty('--lnav-seg-on', SEG16 ? SEG16[1] : (({ production:'#1a1205', sales:'#1a1205' })[crm] || '#fff'));
h.style.setProperty('--lnav-seg-lt', SEG16 ? SEG16[2] : (CRM_COLOR[crm] || CRM_COLOR.retail));
h.style.setProperty('--lnav-seg-on-lt', SEG16 ? SEG16[3] : (({ production:'#1a1205', sales:'#1a1205' })[crm] || '#fff'));
""", label='S5 rail segment hue props')
E("""#cr-lnav .lnav-crm button.on{color:var(--lnav-on,#fff);background:var(--lnav-crmc,#c8202e)}""",
  """#cr-lnav .lnav-crm button.on{color:var(--lnav-seg-on,var(--lnav-on,#fff));background:var(--lnav-seg,var(--lnav-crmc,#c8202e))}
:root[data-theme="rb-light"] #cr-lnav .lnav-crm button.on{color:var(--lnav-seg-on-lt,var(--lnav-on,#fff));background:var(--lnav-seg-lt,var(--lnav-crmc,#c8202e))}""",
  label='S5 rail segment rule')
# the header + : the CRM's hue, whatever head the screen wears (Reports and the
# other shared screens wear the production head, which is why they showed orange).
# A portal with no identity hue (the Production board, Sales Floor) keeps --hac.
E("""#cr-hd2-bar .cr-ib.primary{background:var(--hac,#c8202e);border-color:var(--hac,#c8202e);color:var(--hoc,#1a1a1a);font-size:18px;font-weight:400}""",
  """#cr-hd2-bar .cr-ib.primary{--cr-stack:"J16 edited in place (the + reads the CRM identity hue); it already won these";background:var(--crm-id,var(--hac,#c8202e));border-color:var(--crm-id,var(--hac,#c8202e));color:var(--crm-id-ink,var(--hoc,#1a1a1a));font-size:18px;font-weight:400}body[data-crm="retail"]{--crm-id:#c8202e;--crm-id-ink:#ffffff}body[data-crm="insurance"]{--crm-id:#2dd4bf;--crm-id-ink:#04201c}body[data-crm="community"]{--crm-id:#34d399;--crm-id-ink:#062b1f}:root[data-theme="rb-light"] body[data-crm="insurance"]{--crm-id:#0f766e;--crm-id-ink:#ffffff}:root[data-theme="rb-light"] body[data-crm="community"]{--crm-id:#047857;--crm-id-ink:#ffffff}/* J16: + is the CRM's identity hue (was red / coral / mint / Reports orange). White on #c8202e 5.67, ink on teal 9.18, on emerald 7.96; light white on #0f766e 5.47, #047857 5.48 */""",
  label='S5 header + identity hue')
E("""  background:var(--hac,#376CA0) !important;color:#ffffff !important;
  border-color:var(--hac,#376CA0) !important;}""",
  """  background:var(--crm-id,var(--hac,#376CA0)) !important;color:var(--crm-id-ink,#ffffff) !important;
  border-color:var(--crm-id,var(--hac,#376CA0)) !important;}   /* J16: the CRM hue, not the head's accent */""",
  label='S5 light + identity hue')

# the installed phone moves + into the bottom bar (1365); it is the same marker.
E("""    background:#c8202e;color:#fff;font:400 24px/1 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif}""",
  """    background:var(--crm-id,#c8202e);color:var(--crm-id-ink,#fff);font:400 24px/1 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif}/* J16: the installed-phone + wears the CRM hue too */""",
  label='S5 installed-phone + identity hue')

# ════════════════════════════════════════════════════════════════════════════
# S6 — the desktop (rail-on) menu popover was the last WHITE dropdown over a dark
#      app (judge 15). It keeps its dropdown geometry; its colours become the
#      phone drawer's, dark first with the shipped light values under rb-light.
#      The phone drawer is untouched: its body:not(.cr-lnav-on) rules carry
#      !important on every colour and still win there.
#      ⚠ display stays NON-important here on purpose: role- and portal-hidden rows
#      are hidden by an INLINE display:none, which a stylesheet `display:flex
#      !important` would override (the drawer needs its data-crhide attributes
#      for exactly that reason, and those only exist below 1100px).
# ════════════════════════════════════════════════════════════════════════════
E("""#navMenu{
  position:fixed;right:10px;z-index:120;
  background:#fff;border:1px solid #c9c2bf;border-radius:10px;
  min-width:230px;max-width:calc(100vw - 20px);
  box-shadow:0 10px 28px rgba(0,0,0,.22);overflow:hidden;
}
#navMenu .navopt{display:block;width:100%;text-align:left;padding:11px 16px;border:0;background:#fff;
  font:600 15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#2b2b2b;cursor:pointer;}
#navMenu .navopt:hover{background:#f7efec;color:var(--red-dk);}
#navMenu .navopt + .navopt{border-top:1px solid #eee;}""",
"""#navMenu{
  position:fixed;right:10px;z-index:120;
  background:color-mix(in srgb,var(--hac,#8fb4d8) 9%,#0e1014);border:1px solid rgba(255,255,255,.12);border-radius:10px;
  min-width:230px;max-width:calc(100vw - 20px);
  box-shadow:0 14px 34px rgba(0,0,0,.55);overflow:hidden;
}
#navMenu .navopt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:11px 16px;border:0;background:transparent;
  font:600 15px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#e8ebf0;cursor:pointer;}
#navMenu .navopt svg{width:19px;height:19px;flex:none;color:var(--hac,#b9d3ec);}
#navMenu .navopt:hover{background:color-mix(in srgb,var(--hac,#8fb4d8) 14%,transparent);color:#ffffff;}
#navMenu .navopt + .navopt{border-top:1px solid color-mix(in srgb,var(--hac,#8fb4d8) 12%,transparent);}
/* J16 (judge 15): light restores exactly what shipped for the desktop popover. */
:root[data-theme="rb-light"] #navMenu{background:#ffffff;border-color:#c9c2bf;box-shadow:0 10px 28px rgba(0,0,0,.22);}
:root[data-theme="rb-light"] #navMenu .navopt{color:#2b2b2b;}
:root[data-theme="rb-light"] #navMenu .navopt svg{color:var(--hac,#376CA0);}
:root[data-theme="rb-light"] #navMenu .navopt:hover{background:#f7efec;color:var(--red-dk);}
:root[data-theme="rb-light"] #navMenu .navopt + .navopt{border-top-color:#eee;}""", label='S6 desktop popover base dark-first')
E("""  color:#a9968e; background:#faf7f6;
  border-top:1px solid #eee;
}""", """  color:var(--hac,#8fb4d8); background:transparent;
  border-top:1px solid rgba(255,255,255,.08);
}
/* J16: light section heads, and the shipped #a9968e was 2.65:1 on #faf7f6 — 4.85 now. */
:root[data-theme="rb-light"] #navMenu .navsec{color:#7a6a62;background:#faf7f6;border-top-color:#eee;}""", label='S6 navsec dark-first')
E("""#navMenu .navopt{padding:9px 14px !important;font-size:13px !important}""",
  """#navMenu .navopt{padding:9px 14px !important;font-size:15px !important}/* J16: 13px -> 15px, the drawer's size */""", label='S6 menu 15px')
E("""#navMenu #cr-nav-sec-admin{border-top:1px dashed #e6d9c8;color:#8f1620 !important;background:#f4f2f1}""",
  """#navMenu #cr-nav-sec-admin{border-top:1px dashed rgba(255,255,255,.14);color:#e35c63 !important;background:transparent}:root[data-theme="rb-light"] #navMenu #cr-nav-sec-admin{border-top-color:#e6d9c8;background:#f4f2f1}""",
  label='S6 admin row dark-first')
E("""color:#5a5a5a;background:#faf7f6;border-top:1px solid #f0e8e2;cursor:pointer;""",
  """color:#9aa0a8;background:transparent;border-top:1px solid rgba(255,255,255,.07);cursor:pointer;""", label='S6 palette hint dark-first')
E("""#cr-nav-palette-hint:hover{background:#f5efe0}""",
  """#cr-nav-palette-hint:hover{background:rgba(255,255,255,.05)}:root[data-theme="rb-light"] #cr-nav-palette-hint{color:#5a5a5a;background:#faf7f6;border-top-color:#f0e8e2}:root[data-theme="rb-light"] #cr-nav-palette-hint:hover{background:#f5efe0}""",
  label='S6 palette hint hover + light')
E("""#cr-nav-palette-hint kbd{background:#eee;padding:2px 6px;border-radius:4px;font:800 11px 'SF Mono',Menlo,Consolas,monospace;color:#666;letter-spacing:.06em}""",
  """#cr-nav-palette-hint kbd{background:rgba(255,255,255,.1);padding:2px 6px;border-radius:4px;font:800 11px 'SF Mono',Menlo,Consolas,monospace;color:#cfd6df;letter-spacing:.06em}:root[data-theme="rb-light"] #cr-nav-palette-hint kbd{background:#eee;color:#666}""",
  label='S6 kbd dark-first')

# ════════════════════════════════════════════════════════════════════════════
# S7 — the light pipeline joins dark's flat strip (judge 15/16): the glossy 3D
#      spheres with a repeated letter go; the stage colour stays as the cell's
#      3px top rule (the semantic mapping never leaves JS). The eight dark rules
#      lose their dark-only prefix; light supplies the strip's own --nv-* values.
# ════════════════════════════════════════════════════════════════════════════
B('cr-navy-styles', """:root:not([data-theme="rb-light"]) body:not(.claim-insurance):not(.claim-community) .piperow""",
  """:root body:not(.claim-insurance):not(.claim-community) .piperow""", count=8, label='S7 strip rules in both themes')
for sel in ('.piperow{\n', '.piperow .pipebtn{\n', '.piperow .pcirc{\n'):
    B('cr-navy-styles', ':root body:not(.claim-insurance):not(.claim-community) ' + sel,
      ':root body:not(.claim-insurance):not(.claim-community) ' + sel + '  --cr-stack:"J16 the dark strip rule, widened to light: dark already beat the base here; light now does too, and the base sphere rules stay for Claims/Community bodies";\n',
      label='S7 stack note ' + sel.strip())
B('cr-navy-styles', """:root body:not(.claim-insurance):not(.claim-community) .piperow .pmoney{
  font:700 11px ui-monospace,Menlo,monospace;color:var(--nv-ink2,#8d97a6);order:4}""",
  """:root body:not(.claim-insurance):not(.claim-community) .piperow .pmoney{
  font:700 11px ui-monospace,Menlo,monospace;color:var(--nv-ink2,#8d97a6);order:4}
/* J16: the same strip in LIGHT — white card, a pale recessed well, near-white
   cells. Count #1b1f27 on #f7f8fa 15.6:1, label/money #535c69 6.4:1. These are
   the only light values; the eight rules above are shared with dark verbatim.
   (The light glossy-sphere rules stay in the file: Claims and Community bodies
   are still outside this strip, exactly as in dark.) */
:root[data-theme="rb-light"] body:not(.claim-insurance):not(.claim-community) .piperow{
  --nv-well:#dde1e7;--nv-cell:#f7f8fa;--nv-ink:#1b1f27;--nv-ink2:#535c69;
  --nv-sink:inset 0 1px 2px rgba(15,23,42,.10);}""", label='S7 light strip tokens')

# ════════════════════════════════════════════════════════════════════════════
# S8 — one sans on screen (judge 16 MINOR 16). Georgia stays in every print /
#      document template; these are the on-screen headings and client names
#      that still carried it in Insurance and Community.
# ════════════════════════════════════════════════════════════════════════════
SANS = "'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif"
E("""#cr-hd2-mid #brandTitle h1{margin:0;font-family:Georgia,'Times New Roman',serif;""",
  """#cr-hd2-mid #brandTitle h1{--cr-stack:"J16 edited in place (font family only); this rule already won every property it declares";margin:0;font-family:""" + SANS + """;""", label='S8 header title sans')
E("""#cr-hd2-mid #brandCtx,#cr-hd2-mid #headCtx{font-family:Georgia,'Times New Roman',serif;""",
  """#cr-hd2-mid #brandCtx,#cr-hd2-mid #headCtx{--cr-stack:"J16 edited in place (font family only); this rule already won every property it declares";font-family:""" + SANS + """;""", label='S8 header context sans')
E(""".heroNm{font:800 18px Georgia,'Times New Roman',serif;""",
  """.heroNm{font:800 18px """ + SANS + """;""", label='S8 client name sans')
E("""#cr-cc .cc2-name .nm b{display:block;font:700 22px Georgia,'Times New Roman',serif;""",
  """#cr-cc .cc2-name .nm b{display:block;font:700 22px """ + SANS + """;""", label='S8 community client name sans')
E("""#cr-cc .pin .t .nm b{display:block;font-family:var(--serif);""",
  """#cr-cc .pin .t .nm b{display:block;font-family:inherit;""", label='S8 community pin name sans')
E("""#cr-cc .sheet .lh h4{margin:6px 0 0;font-family:var(--serif);""",
  """#cr-cc .sheet .lh h4{margin:6px 0 0;font-family:inherit;""", label='S8 community sheet head sans')
E(""".viewhead{
  text-align:center;
  font:800 22px Georgia,'Times New Roman',serif;""", """.viewhead{
  text-align:center;
  font:800 22px """ + SANS + """;/* J16: was Georgia (Communications, Payments, Tasks... in Insurance and light) */""",
  label='S8 view headings sans')

# ════════════════════════════════════════════════════════════════════════════
# S9 — tap targets, gutter, the gold row (judge 16 MINOR 15 / POLISH)
# ════════════════════════════════════════════════════════════════════════════
E("""#cr-estimates-mount .cre-card .cre-del{
  background:none;border:0;cursor:pointer;padding:2px 6px;margin-left:8px;
  font:700 18px/1 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:var(--rbe-mute,#9aa0a8);
  opacity:.55;border-radius:6px;transition:opacity .14s,color .14s,background .14s;
}
#cr-estimates-mount .cre-card .cre-del:hover{
  opacity:1;color:#fff;background:#c8202e;
}""", """#cr-estimates-mount .cre-card .cre-del{
  /* J16: was a 24x22 grey x at 55% opacity. 44x44, the danger ink (Buttons A:
     red words, no fill), and creDiscard() still asks before it acts. */
  background:none;border:1px solid transparent;cursor:pointer;padding:0;margin-left:4px;
  width:44px;height:44px;min-width:44px;flex:none;display:inline-flex;align-items:center;justify-content:center;
  font:700 22px/1 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#e35c63;
  border-radius:10px;transition:color .14s,background .14s,border-color .14s;
}
#cr-estimates-mount .cre-card .cre-del:hover,
#cr-estimates-mount .cre-card .cre-del:focus-visible{border-color:currentColor;background:rgba(227,92,99,.12);}
:root[data-theme="rb-light"] #cr-estimates-mount .cre-card .cre-del{color:#8f1620;}
:root[data-theme="rb-light"] #cr-estimates-mount .cre-card .cre-del:hover,
:root[data-theme="rb-light"] #cr-estimates-mount .cre-card .cre-del:focus-visible{background:rgba(143,22,32,.08);}""", label='S9 cre-del 44px danger')
E("""<button class="cre-del" data-cre-discard="${r.id}" title="Discard this estimate">&times;</button>""",
  """<button type="button" class="cre-del" data-cre-discard="${r.id}" title="Discard this estimate" aria-label="Discard this estimate">&times;</button>""",
  label='S9 cre-del name')
E("""#cr-ch2 .tabbar .cc-analytics{margin-left:auto;flex:0 0 auto;width:34px;height:34px;""",
  """#cr-ch2 .tabbar .cc-analytics{margin-left:auto;flex:0 0 auto;width:44px;height:44px;/* J16: was 34x34 */""", label='S9 community chart button 44px')
# Build 1417 (comms, builder C) shipped this exact gutter as its own rule
# ("1417 #9"). On a base that already has it, adding it again would be a second
# copy of one fix, so the edit is skipped — asserted either way, never guessed.
GUTTER_1417 = "#cr-cc{padding-left:16px;padding-right:16px}"
if src.count(GUTTER_1417) == 1:
    print('patch_A: base already carries the 1417 Community gutter; S9 gutter edit skipped')
else:
    assert src.count(GUTTER_1417) == 0
    E("""--serif:Georgia,'Times New Roman',serif;margin:18px 0 14px;""",
      """--serif:Georgia,'Times New Roman',serif;margin:18px 0 14px;padding-left:16px;padding-right:16px;box-sizing:border-box;/* J16: the Community profile had no side gutter at 390 (title at x=2) */""",
      label='S9 community profile gutter')
E(""":root:not([data-theme="rb-light"]) #cr-lnav .lnav-item[data-k="switchportal"] .lnav-tx{color:#f0c651}  /* 1299: was data-k="landing"; 1165 renamed the row's label to "Switch portal" and data-k follows the label, so this matched nothing for 130 builds */
""", """/* J16 (judge 16 polish): "Switch portal" is a row, not a portal door — the gold it
   carried (539's literal-yellow LANDING, re-matched at 1299 after 1165 renamed the
   row) is DELETED in both themes, so it takes the rail's normal ink like Clients. */
""", label='S9 switch portal gold gone (dark)')
E(""":root[data-theme="rb-light"] #cr-lnav .lnav-item[data-k="switchportal"] .lnav-tx{color:#8a6100}  /* 539 chose literal yellow here (1.47:1, with the number in front of him); 1035 asked, and
     the call came back "I trust you would do it best" (24 Aug). Best = the obsidian-tiles
     precedent (545/557): the SAME hue deepened, never a swap — dark keeps the true yellow,
     light gets 538's amber, computed for this exact rail (4.99 / 5.54 / 4.55). */
""", "", label='S9 switch portal gold gone (light)')

# ════════════════════════════════════════════════════════════════════════════
# S10 — found by this build's own whole-document sweep (not on the judge's list)
# ════════════════════════════════════════════════════════════════════════════
# the menu footer (build stamp) carries an INLINE light-era ink and line; the
# drawer's !important override was phone-only, so the desktop popover kept
# #b6a89f — 2.31:1 once light. The drawer's two footer rules now hold at every width.
E("""body:not(.cr-lnav-on) #navMenu [data-cr-footer]{background:transparent !important;color:#9aa2ae !important;border-top:1px solid rgba(255,255,255,.06) !important;margin-top:4px;}""",
  """#navMenu [data-cr-footer]{background:transparent !important;color:#9aa2ae !important;border-top:1px solid rgba(255,255,255,.06) !important;margin-top:4px;}/* J16: every width (the desktop popover too) */""",
  label='S10 menu footer every width (dark)')
E(""":root[data-theme="rb-light"] body:not(.cr-lnav-on) #navMenu [data-cr-footer]{
  color:#5A6472 !important;border-top:1px solid rgba(0,0,0,.08) !important;}""",
  """:root[data-theme="rb-light"] #navMenu [data-cr-footer]{
  color:#5A6472 !important;border-top:1px solid rgba(0,0,0,.08) !important;}""",
  label='S10 menu footer every width (light)')
# the client directory's filter counts: 3.50:1 dark, 3.13:1 light.
E(""".cd-frow .c{margin-left:auto;font:700 11px ui-monospace,Menlo,monospace;color:#6d6a63;}""",
  """.cd-frow .c{margin-left:auto;font:700 11px ui-monospace,Menlo,monospace;color:#908b83;}/* J16: was #6d6a63, 3.50:1 -> 5.58 */""",
  label='S10 filter counts dark')
E(""":root[data-theme="rb-light"] .cd-frow .c{color:#8f8f8f;}""",
  """:root[data-theme="rb-light"] .cd-frow .c{color:#6b6b6b;}/* J16: was #8f8f8f, 3.13:1 -> 5.24 */""",
  label='S10 filter counts light')

# the Resource Library shares <body data-rltheme>, so it now opens in Siren in a
# dark app too. Its Siren accent #E5484D carries WHITE labels at 3.91:1 (Ask / File,
# the panel's send and file buttons, my own chat bubble). Backgrounds take the app's
# one red in Siren (5.67); the accent itself stays for the one place it is TEXT
# (4.61 on the panel), where #C8202E would fall to 3.18. Docket sets no --lb-accent-bg.
B('cr-lib-styles', "background:var(--lb-accent,#C4180F)", "background:var(--lb-accent-bg,var(--lb-accent,#C4180F))", count=5,
  label='S10 library accent fills read --lb-accent-bg')
B('cr-lib-styles', "--lb-accent:#E5484D;--lb-accent-ink:#FFFFFF;", "--lb-accent:#E5484D;--lb-accent-bg:#C8202E;--lb-accent-ink:#FFFFFF;",
  label='S10 library siren fill (J16: 3.91 -> 5.67)')

# ════════════════════════════════════════════════════════════════════════════
for label, old, new, count, block in EDITS:
    try:
        src = apply_block(src, block, old, new, count) if block else pl.sub(src, old, new, count)
    except pl.PatchError as e:
        raise SystemExit('PATCH FAILED [%s]: %s' % (label, e))
assert src != ORIG
pl.write_atomic(PATH, src)
print('patch_A: %d edits applied to %s' % (len(EDITS), PATH))
