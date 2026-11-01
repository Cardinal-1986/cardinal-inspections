#!/usr/bin/env python3
"""patch_1436_sun.py <in.html> <out.html> — build 1436: SUN, a third appearance (Theo's T8 C pick).

    Built on 1433 by a builder; E4's anchor is merged here with 1435's cr-theme event (lastTheme),
    which edited the same apply(). Both behaviours are kept.

    Menu -> Appearance: Dark · Light · Sun.  Same key as the other two
    (localStorage 'cardinal.theme.rb': '0' Dark, '1' Light, 'sun' Sun), same 1s sweep,
    same apply(). Sun IS the light theme (data-theme="rb-light") plus data-cr-sun="1" on
    :root, which one stylesheet (cr-sun-styles) and the Text size zoom read.

    A production or field account (isProductionUser / isFieldUser) with NO stored choice
    opens in Sun. A stored Dark or Light wins. Admins and reps default exactly as before.

Edits, in file order (each exact-match, count asserted before any write):
  E1  head pre-paint: a stored 'sun' sets data-cr-sun before first paint, beside Text size
  E2  cr-textsize-styles: Sun is one Text size step up, and the user's own step still applies
  E3  the drawer's Appearance row gains a third button, Sun
  E4  cr-rbtheme-toggle-script: three modes, role default, setMode(); apply() at parse time
  E5  the sign-in role mirror re-applies the theme before Production opens
  E6  cr-sun-styles, generated, inserted right after the theme script
  E7  day-sheet light defect: #cr-pb-modal never got the light tokens (1.02:1 in Light)
  E8  insurance + library readers of the app key: Sun (and the role default) is light
Byte-reproducible: no clocks, no randomness, generation walks the input in file order.
"""
import re
import sys
import os

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
sys.path.insert(0, HERE)
import patch_lib as pl  # noqa: E402
import csswalk          # noqa: E402

SRC, OUT = sys.argv[1], sys.argv[2]
src = pl.load(SRC)
orig = src
assert 'data-cr-sun' not in src, 'already patched'

SUN = ':root[data-cr-sun][data-theme="rb-light"]'   # every Sun colour rule starts here: (0,3,0)

# ── E1 · pre-paint ───────────────────────────────────────────────────────────
src = pl.sub(src,
    "if(z==='lg'||z==='xl')document.documentElement.setAttribute('data-cr-text',z);})();",
    "if(z==='lg'||z==='xl')document.documentElement.setAttribute('data-cr-text',z);})();\n"
    "/* Sun (T8 C): a STORED Sun is known before first paint, so its Text size step is\n"
    "   applied with the user's own step instead of jumping in later. A field account\n"
    "   with no stored choice gets Sun at sign-in (cr-rbtheme-toggle-script). */\n"
    "(function(){var t;try{t=localStorage.getItem('cardinal.theme.rb');}catch(e){}\n"
    "if(t==='sun')document.documentElement.setAttribute('data-cr-sun','1');})();")

# ── E2 · Text size: Sun is one step up, on top of the user's own step ─────────
src = pl.sub(src,
    ':root[data-cr-text="lg"]{zoom:1.15;}\n:root[data-cr-text="xl"]{zoom:1.30;}',
    '/* Sun (T8 C) moves the ladder one step: Normal 1.15, Large 1.30, Larger 1.45.\n'
    '   The user\'s own Text size still applies ON TOP — Sun never writes data-cr-text,\n'
    '   so turning Sun off returns exactly the step they chose. Edited in place rather\n'
    '   than out-specified: one ladder, one place.\n'
    '   --cr-zoom carries the same factor for the few rules that size with vw: under a :root\n'
    '   zoom 100vw is still the unzoomed viewport, so calc(100vw - x) overhangs by the zoom. */\n'
    ':root[data-cr-text="lg"]:not([data-cr-sun]),:root[data-cr-sun]:not([data-cr-text]){zoom:1.15;--cr-zoom:1.15;}\n'
    ':root[data-cr-text="xl"]:not([data-cr-sun]),:root[data-cr-sun][data-cr-text="lg"]{zoom:1.30;--cr-zoom:1.30;}\n'
    ':root[data-cr-sun][data-cr-text="xl"]{zoom:1.45;--cr-zoom:1.45;}')

# ── E3 · the Appearance row ──────────────────────────────────────────────────
src = pl.sub(src,
    '<button type="button" data-cr-appear="light" aria-pressed="false">Light</button></div>',
    '<button type="button" data-cr-appear="light" aria-pressed="false">Light</button>'
    '<button type="button" data-cr-appear="sun" aria-pressed="false" title="High contrast for daylight: bolder, larger, darker text">Sun</button></div>')

# ── E4 · the theme module ────────────────────────────────────────────────────
src = pl.sub(src,
"""var KEY = 'cardinal.theme.rb';
function isLight(){
try{ return localStorage.getItem(KEY) === '1'; }catch(e){ return false; }
}
function setLight(v){
try{ localStorage.setItem(KEY, v ? '1' : '0'); }catch(e){}
apply();
}
var lastTheme = null;
function apply(){
if(isLight()) document.documentElement.setAttribute('data-theme','rb-light');
else document.documentElement.removeAttribute('data-theme');
/* T1 C (1 Nov 2026): announce a flip, for what CSS cannot reach - the Reports
   charts are canvas. Fired on the EDGE only: apply() rides the 1s sweep below,
   and an event every second would be 567/569's loop in a new coat. */
var th = document.documentElement.getAttribute('data-theme') || '';
if(lastTheme !== null && th !== lastTheme){ try{ document.dispatchEvent(new CustomEvent('cr-theme', { detail:{ theme: th || 'dark' } })); }catch(e){} }
lastTheme = th;
var btn = document.getElementById('cr-dark-toggle');
/* 1181: on insurance the glyph reads the INSURANCE theme — a sun that never
   changes while the screen does is exactly the "control that lies" the 694
   note below refuses to ship. */
var lit = inInsurancePortal() ? insLight() : isLight();
paintGlyph(btn, lit);
paintAppear(lit);
}""",
"""var KEY = 'cardinal.theme.rb';
/* SUN (Theo's T8 C pick, for a roof in daylight). ONE key, a third value:
   '0' Dark · '1' Light · 'sun' Sun. Sun IS the light theme (data-theme="rb-light")
   plus data-cr-sun on :root — cr-sun-styles reads it for inks at 7:1, one weight
   heavier, and cr-textsize-styles for one Text size step up.
   With NO stored choice a production or field account (Curtis, Scottie) opens in
   Sun; everyone else opens Dark, exactly as before. A stored choice always wins. */
function stored(){
try{ var v = localStorage.getItem(KEY); return (v === '0' || v === '1' || v === 'sun') ? v : ''; }catch(e){ return ''; }
}
function fieldDefault(){
try{ return !!((typeof window.isProductionUser === 'function' && window.isProductionUser()) ||
               (typeof window.isFieldUser === 'function' && window.isFieldUser())); }catch(e){ return false; }
}
function mode(){
var v = stored();
return v === '1' ? 'light' : v === 'sun' ? 'sun' : v === '0' ? 'dark' : (fieldDefault() ? 'sun' : 'dark');
}
function isLight(){ return mode() !== 'dark'; }
function isSun(){ return mode() === 'sun'; }
function setLight(v){
try{ localStorage.setItem(KEY, v ? '1' : '0'); }catch(e){}
apply();
}
/* the drawer's three buttons: write the choice, and keep the insurance palette on
   the same side (J16: one switch, both keys) — Sun is a light theme there. */
function setMode(m){
if(m !== 'dark' && m !== 'light' && m !== 'sun') return;
try{ localStorage.setItem(KEY, m === 'sun' ? 'sun' : m === 'light' ? '1' : '0'); }catch(e){}
var ins = m === 'dark' ? 'siren' : 'docket';
try{ localStorage.setItem('cardinalRLTheme', ins); }catch(e){}
try{ if(window.CardinalInsTheme && window.CardinalInsTheme.apply) window.CardinalInsTheme.apply(ins); }catch(e){}
apply();
}
/* the header switch flips between Dark and the account's own light appearance */
function litKey(){ return stored() === '1' ? '1' : (stored() === 'sun' || fieldDefault()) ? 'sun' : '1'; }
var lastTheme = null;
function apply(){
var root = document.documentElement, m = mode();
if(m !== 'dark') root.setAttribute('data-theme','rb-light');
else root.removeAttribute('data-theme');
/* T1 C (1435): announce a data-theme flip on the EDGE only, for the canvas charts.
   Sun and Light share data-theme, and the charts' ink with it, so Light <-> Sun fires nothing. */
var th = root.getAttribute('data-theme') || '';
if(lastTheme !== null && th !== lastTheme){ try{ document.dispatchEvent(new CustomEvent('cr-theme', { detail:{ theme: th || 'dark' } })); }catch(e){} }
lastTheme = th;
/* written only on a change: this rides the 1s sweep (the 567/569 lesson) */
if(m === 'sun'){ if(root.getAttribute('data-cr-sun') !== '1') root.setAttribute('data-cr-sun','1'); }
else if(root.hasAttribute('data-cr-sun')) root.removeAttribute('data-cr-sun');
var btn = document.getElementById('cr-dark-toggle');
/* 1181: on insurance the glyph reads the INSURANCE theme — a sun that never
   changes while the screen does is exactly the "control that lies" the 694
   note below refuses to ship. */
var lit = inInsurancePortal() ? insLight() : (m !== 'dark');
paintGlyph(btn, lit);
paintAppear(inInsurancePortal() ? (insLight() ? (m === 'dark' ? 'light' : m) : 'dark') : m);
}""")

src = pl.sub(src,
"""function paintAppear(lit){
var bs = document.querySelectorAll('[data-cr-appear]');
for(var i = 0; i < bs.length; i++){
bs[i].setAttribute('aria-pressed', String((bs[i].getAttribute('data-cr-appear') === 'light') === lit));
}
}
document.addEventListener('click', function(e){
var t = /** @type {Element} */ (e.target);
var b = t && t.closest && t.closest('[data-cr-appear]');
if(!b) return;
e.preventDefault();
var want = b.getAttribute('data-cr-appear') === 'light';
var lit = inInsurancePortal() ? insLight() : isLight();
if(want !== lit) toggle(); else apply();
});""",
"""function paintAppear(m){
var bs = document.querySelectorAll('[data-cr-appear]');
for(var i = 0; i < bs.length; i++){
var on = String(bs[i].getAttribute('data-cr-appear') === m);
if(bs[i].getAttribute('aria-pressed') !== on) bs[i].setAttribute('aria-pressed', on);
}
}
document.addEventListener('click', function(e){
var t = /** @type {Element} */ (e.target);
var b = t && t.closest && t.closest('[data-cr-appear]');
if(!b) return;
e.preventDefault();
setMode(b.getAttribute('data-cr-appear'));
});""")

src = pl.sub(src,
"""    try{ localStorage.setItem(KEY, next === 'docket' ? '1' : '0'); }catch(e){}
    window.CardinalInsTheme.apply(next);
    apply();
    return;
  }
  setLight(!isLight());""",
"""    try{ localStorage.setItem(KEY, next === 'docket' ? litKey() : '0'); }catch(e){}
    window.CardinalInsTheme.apply(next);
    apply();
    return;
  }
  /* Sun: from Dark the switch returns to the account's light appearance */
  try{ localStorage.setItem(KEY, isLight() ? '0' : litKey()); }catch(e){}
  apply();""")

src = pl.sub(src,
"""if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
window.CardinalRBTheme = { toggle:toggle, isLight:isLight, setLight:setLight };
})();""",
"""/* Sun: apply once at PARSE time too. On a warm start the sign-in can run before
   this block parses; the role default must then be on the page before Production
   paints, not a second later. apply() needs only documentElement and body. */
apply();
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
window.CardinalRBTheme = Object.assign(window.CardinalRBTheme || {}, { toggle:toggle, isLight:isLight, setLight:setLight,
  isSun:isSun, mode:mode, setMode:setMode, apply:apply });
})();""")

# ── E5 · sign-in: the role is known, so the default is known ─────────────────
src = pl.sub(src,
    "  try{ document.body.classList.toggle('cr-field', (typeof isFieldUser === 'function' && isFieldUser())); }catch(_cf){}   /* 1317 */\n",
    "  try{ document.body.classList.toggle('cr-field', (typeof isFieldUser === 'function' && isFieldUser())); }catch(_cf){}   /* 1317 */\n"
    "  /* Sun: a field/production account with no stored appearance opens in Sun — applied here,\n"
    "     before Production opens below, so the board never paints dark first. */\n"
    "  try{ if(window.CardinalRBTheme && typeof window.CardinalRBTheme.apply === 'function') window.CardinalRBTheme.apply(); }catch(_ct){}\n")

# ── E7 · the day sheet's light defect ────────────────────────────────────────
# #cr-pb-modal sits OUTSIDE #cr-pb, so `:root[data-theme="rb-light"] #cr-pb{--pb-*}` never
# reached it: in Light every token in the day sheet fell back to its DARK literal — dark
# rows on the white sheet, and the date in #17191c on a #15171a band (1.02:1). The
# 1090 note says the rows "are already themed"; they were, for #cr-pb only.
src = pl.sub(src, ':root[data-theme="rb-light"] #cr-pb{\n',
                  ':root[data-theme="rb-light"] #cr-pb,\n:root[data-theme="rb-light"] #cr-pb-modal{\n'
                  '  --cr-stack:"the rb-light twin of #cr-pb\'s dark tokens, which stay for Dark; #cr-pb-modal joined it because the day sheet sits outside #cr-pb";\n')
src = pl.sub(src, "  position:sticky; top:0; background:#15171a; z-index:2;",
                  "  position:sticky; top:0; background:var(--pb-c,#15171a); z-index:2;")
src = pl.sub(src, "  background:transparent; border:1px solid rgba(230,235,240,.14); color:#e6ebf0;",
                  "  background:transparent; border:1px solid var(--pb-line,rgba(230,235,240,.14)); color:var(--pb-ink,#e6ebf0);")
src = pl.sub(src, "  padding:3px 8px; border-radius:999px; background:rgba(230,90,70,.16); color:#ff8a7a;",
                  "  padding:3px 8px; border-radius:999px; background:rgba(230,90,70,.16); color:var(--pb-hot,#ff8a7a);")

# ── E9 · Dispatch's day strip under zoom (Sun's size step, and Text size since 939) ──
# dayJump() measured the target with getBoundingClientRect() (viewport px, zoomed) and
# moved scrollLeft (the scroller's own px). At zoom 1.15 it over-panned past the day and
# dragged the tray off the left edge — identical on 1433 with Text size Large. Dividing by
# the rect/offset ratio is exact under zoom and 1 wherever an engine reports both alike.
src = pl.sub(src,
    "    var off = hd.getBoundingClientRect().left - sc.getBoundingClientRect().left - (rail ? rail.getBoundingClientRect().width : 0);\n"
    "    try{ sc.scrollTo({ left: Math.max(0, sc.scrollLeft + off), behavior:'smooth' }); }catch(_){ sc.scrollLeft += off; }",
    "    var off = hd.getBoundingClientRect().left - sc.getBoundingClientRect().left - (rail ? rail.getBoundingClientRect().width : 0);\n"
    "    /* Sun / Text size: rects are zoomed viewport px, scrollLeft is the scroller's own px */\n"
    "    var zr = sc.offsetWidth ? sc.getBoundingClientRect().width / sc.offsetWidth : 1;\n"
    "    if(zr > 0.2) off = off / zr;\n"
    "    try{ sc.scrollTo({ left: Math.max(0, sc.scrollLeft + off), behavior:'smooth' }); }catch(_){ sc.scrollLeft += off; }")

# ── E10 · Dispatch's sticky tray width under zoom ────────────────────────────
# calc(100vw - 50px): under a :root zoom 100vw stays the unzoomed 390, the layout is 339 CSS px,
# so the Needs-a-crew tray and the trade strips ran ~47px past the scroller (1433 + Large too).
src = pl.sub(src,
    "  #cr-disp .drail, #cr-disp .dband, #cr-disp .dsum{ position:sticky; left:0; max-width:calc(100vw - 50px); }",
    "  #cr-disp .drail, #cr-disp .dband, #cr-disp .dsum{ position:sticky; left:0; max-width:calc(100vw / var(--cr-zoom,1) - 50px); }   /* Sun / Text size: vw is unzoomed */")

# ── E8 · the two readers of the app key that decide the insurance palette ────
src = pl.sub(src,
    "         return localStorage.getItem('cardinal.theme.rb') === '1' ? 'docket' : 'siren'; }catch(e){ return 'siren'; }",
    "         return (window.CardinalRBTheme && window.CardinalRBTheme.isLight ? window.CardinalRBTheme.isLight() : localStorage.getItem('cardinal.theme.rb') === '1') ? 'docket' : 'siren'; }catch(e){ return 'siren'; }   /* Sun is light */")
src = pl.sub(src,
    "      return localStorage.getItem('cardinal.theme.rb') === '1' ? 'docket' : 'siren';",
    "      return (window.CardinalRBTheme && window.CardinalRBTheme.isLight ? window.CardinalRBTheme.isLight() : localStorage.getItem('cardinal.theme.rb') === '1') ? 'docket' : 'siren';   /* Sun is light */")

# ── E6 · cr-sun-styles ───────────────────────────────────────────────────────
exec(open(os.path.join(HERE, 'sun_css.py'), encoding='utf-8').read())   # defines build_sun_css(src) -> str
css = build_sun_css(orig)
anchor = "window.CardinalRBTheme = Object.assign(window.CardinalRBTheme || {}, { toggle:toggle, isLight:isLight, setLight:setLight,\n  isSun:isSun, mode:mode, setMode:setMode, apply:apply });\n})();\n</script>\n"
src = pl.sub(src, anchor, anchor + '<style id="cr-sun-styles">\n' + css + '</style>\n')

pl.write_atomic(OUT, src)
pl.assert_in(OUT, 'data-cr-appear="sun"')
pl.assert_in(OUT, '<style id="cr-sun-styles">')
print('patch_1436_sun: wrote', OUT, len(src) - len(orig), 'chars added')
