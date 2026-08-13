# -*- coding: utf-8 -*-
"""Build 751 — the photo gallery opens the photo, not the client.

   Theo: "when opening the photo gallery, when photo is touched it goes to
   client profile. Can you make it so it enlarges the photo ... full screen and
   gives option to go to the profile or back arrow"

   THE PRIME DOCTRINE, THIRD TIME THIS SESSION. A full-screen photo viewer
   already ships -- `cr-ri-script`, `window.CardinalResourceImages.open(src,
   caption)`: fixed overlay, dark ground, caption, Escape to close, body scroll
   lock, and it is already used from NINE call sites including Punch & Repairs'
   zoom. The Photo Activity grid was simply never pointed at it. Its handler is
   four lines and goes straight to the client:

       var pid = c.getAttribute('data-pid');
       if(pid && typeof openProject === 'function') openProject(pid);

   So no viewer is written here. The grid calls the existing one, and the viewer
   gains an OPTIONAL action bar so a caller can offer a destination.

   ⚠️ THE OVERLAY IS A SINGLETON AND IS REUSED ACROSS OPENS. `ensureZoom()`
   builds it once and every later open() reuses the same node. So the action bar
   MUST be cleared on every open, or a photo opened from the gallery leaves an
   "Open client" button behind on the next Resource Library image -- pointing at
   whichever client happened to be open before. Every open() resets it, asserted
   in the gate by opening WITH an action and then WITHOUT one.

   ⚠️ `zoom.onclick = close` MEANS ANY CLICK CLOSES. That is what makes tapping
   the photo dismiss it, and it must keep working -- but a click on the action
   bar would bubble and close before navigating. The bar stops propagation and
   drives close() itself, in the order it wants.

   ⚠️ NO 14TH SCROLL-LOCK WRITER. cr-ri-script is already one of the thirteen
   modules that write `document.body.style.overflow`; this build adds no new
   write, it reuses the module's own open/close pair.

   TOUCH TARGETS, as a down payment on the wider question. Measured at 390px
   with a real browser, the viewer's close button was **38x38** -- under the 44px
   floor Theo asked about in the same message. It and both new buttons are now
   >= 44px. That is three controls, measured, not an app-wide restyle.
"""
import sys, re
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

SRC = '/home/user/cardinal-inspections/index.html'
src = pl.load(SRC)
orig = src

def one(source, old, new):
    assert source.count(old) == 1, 'anchor not unique (%d): %r' % (source.count(old), old[:90])
    return source.replace(old, new)

# ── 1. the viewer learns an optional action bar ─────────────────────────────
old = """zoom.innerHTML =
'<button class="close" type="button" aria-label="Close">\\u2715</button>' +
'<img alt=""><div class="cap"></div>';
zoom.onclick = close;"""
new = """zoom.innerHTML =
'<button class="close" type="button" aria-label="Close">\\u2715</button>' +
'<img alt=""><div class="cap"></div>' +
'<div class="acts" hidden>' +
  '<button type="button" data-ri="back">\\u2039 Back</button>' +
  '<button type="button" data-ri="go"></button>' +
'</div>';
/* Any click on the backdrop closes -- that is what makes tapping the photo
   dismiss it, and nine existing callers rely on it. The action bar therefore
   has to stop the click reaching here and run close() in its own order. */
zoom.onclick = close;
zoom.querySelector('.acts').onclick = function(e){ e.stopPropagation(); };
zoom.querySelector('[data-ri="back"]').onclick = function(e){ e.stopPropagation(); close(); };
zoom.querySelector('[data-ri="go"]').onclick = function(e){
  e.stopPropagation();
  var fn = action;            /* read BEFORE close(), which clears it */
  close();
  if(typeof fn === 'function') fn();
};"""
src = one(src, old, new)

src = one(src, "var zoom = null;", "var zoom = null;\nvar action = null;")

old = """function close(){
if(zoom) zoom.classList.remove('open');
document.body.style.overflow = '';
}"""
new = """function close(){
if(zoom) zoom.classList.remove('open');
action = null;
document.body.style.overflow = '';
}"""
src = one(src, old, new)

old = """function open(src, caption){
ensureZoom();
zoom.querySelector('img').src = src;
var cap = zoom.querySelector('.cap');
cap.textContent = caption || '';
cap.style.display = caption ? '' : 'none';
zoom.classList.add('open');
document.body.style.overflow = 'hidden';
}"""
new = """function open(src, caption, opts){
ensureZoom();
zoom.querySelector('img').src = src;
var cap = zoom.querySelector('.cap');
cap.textContent = caption || '';
cap.style.display = caption ? '' : 'none';

/* ⚠️ THE OVERLAY IS A SINGLETON. Reset the action bar on EVERY open, or a
   photo opened from the gallery leaves its "Open client" button sitting on
   the next Resource Library image, pointing at the wrong client. */
var acts = zoom.querySelector('.acts');
var go   = zoom.querySelector('[data-ri="go"]');
action = (opts && typeof opts.onAction === 'function') ? opts.onAction : null;
if(action){
  go.textContent = (opts.actionLabel || 'Open') + ' \\u203a';
  acts.hidden = false;
}else{
  go.textContent = '';
  acts.hidden = true;
}

zoom.classList.add('open');
document.body.style.overflow = 'hidden';
}"""
src = one(src, old, new)

# ── 2. the touch targets on the viewer ──────────────────────────────────────
old = "#cr-ri-zoom .close{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));right:16px;width:38px;height:38px;"
new = ("/* 751: 38px measured at 390px width, under the 44px floor. */\n"
       "#cr-ri-zoom .close{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));right:16px;width:44px;height:44px;")
src = one(src, old, new)

old = "#cr-ri-zoom .cap{margin-top:14px;"
new = ("#cr-ri-zoom .acts{display:flex;gap:12px;margin-top:16px;flex-wrap:wrap;justify-content:center;}\n"
       "#cr-ri-zoom .acts[hidden]{display:none;}\n"
       "#cr-ri-zoom .acts button{min-height:44px;min-width:44px;padding:0 18px;border:0;border-radius:22px;"
       "font:700 14px 'Segoe UI',Arial,sans-serif;cursor:pointer;background:rgba(255,255,255,.14);color:#fff;}\n"
       "#cr-ri-zoom .acts button[data-ri=\"go\"]{background:#c8202e;}\n"
       "#cr-ri-zoom .cap{margin-top:14px;")
src = one(src, old, new)

# the image must leave room for the bar
old = "#cr-ri-zoom img{max-width:100%;max-height:calc(100% - 56px);"
new = "#cr-ri-zoom img{max-width:100%;max-height:calc(100% - 118px);"
src = one(src, old, new)

# ── 3. the gallery opens the PHOTO ──────────────────────────────────────────
old = """document.getElementById('phGrid').addEventListener('click', function(e){
  var c = e.target.closest('.phc');
  if(!c) return;
  var pid = c.getAttribute('data-pid');
  if(pid && typeof openProject === 'function') openProject(pid);
});"""
new = """document.getElementById('phGrid').addEventListener('click', function(e){
  var c = e.target.closest('.phc');
  if(!c) return;
  var pid = c.getAttribute('data-pid');
  /* 751: tapping a photo used to jump straight to the client, so there was no
     way to LOOK at the photo -- Theo's report. It now opens full screen in the
     viewer that already existed (cr-ri-script), with the client's name as the
     caption and the jump offered as a button rather than forced. */
  var img = c.querySelector('img');
  var who = (c.querySelector('.phn') || {}).textContent || '';
  var srcUrl = img && (img.currentSrc || img.getAttribute('src'));
  if(srcUrl && window.CardinalResourceImages){
    window.CardinalResourceImages.open(srcUrl, who, (pid && typeof openProject === 'function') ? {
      actionLabel: 'Open client',
      onAction: function(){ openProject(pid); }
    } : null);
    return;
  }
  /* no viewer or no image: the old behaviour is better than nothing */
  if(pid && typeof openProject === 'function') openProject(pid);
});"""
src = one(src, old, new)

# ── 4. stamp + changelog ────────────────────────────────────────────────────
olds = ("v2026-08-12 build 750 &#8212; Shingle colour and drip edge colour are dropdowns on the roofing "
        "agreement instead of blank boxes")
news = ("v2026-08-12 build 751 &#8212; Tapping a photo in the gallery opens the photo full screen instead of "
        "jumping to the client")
assert src.count(olds) == 1, 'app stamp anchor'
src = src.replace(olds, news)

oldc = "var CHANGELOG = [\n{ b:750,"
newc = ("var CHANGELOG = [\n"
        "{ b:751, d:'2026-08-12', t:'Photos open as photos',\n"
        "s:'In Photo Activity, tapping a photo used to jump straight to the client profile, so there was no "
        "way to actually look at the picture. It now opens full screen, with the client name under it and two "
        "buttons: Back, and Open client if you did want the profile after all. Tapping the photo itself, the "
        "X, or Escape all close it. Nothing was built for this \\u2014 it is the same full-screen viewer the "
        "Resource Library and Punch Outs already used, which the gallery had simply never been pointed at. "
        "The close button also grew from 38 to 44 pixels, which is the size a gloved finger needs.' },\n"
        "{ b:750,")
assert src.count(oldc) == 1, 'changelog anchor'
src = src.replace(oldc, newc)

assert src != orig
pl.write_atomic(SRC, src)
print('PATCH OK')

# ── self-checks ─────────────────────────────────────────────────────────────
assert src.count('function open(src, caption, opts)') == 1
assert src.count("var action = null;") == 1
# FOUR sites, not three: css rule, markup, the onclick binding, and the
# querySelector inside open() that resets the label. Counted the concept
# instead of the string first time round.
assert src.count('data-ri="go"') == 4
assert src.count('data-ri="back"') == 2     # markup + handler
# ⚠️ SLICE THE BLOCK FIRST. `function close(){` appears TWENTY-ONE times in this
# file, so src.index() lands on some other module's close() and the assertion
# fails against a correct patch. And a file-wide count of 'action = null;' is
# 2, not 1, because the declaration `var action = null;` contains it. Both are
# the file's own "scope the assertion to the block, not the file" rule, hit
# twice in one build.
_b = src.index('<script id="cr-ri-script"')
_blk = src[_b:src.index('</script>', _b)]
_c = _blk.index('function close(){')
_close = _blk[_c:_blk.index('}', _c) + 1]
assert 'action = null;' in _close, 'cr-ri close() must clear the action'
assert _blk.count('action = null;') == 2, 'the declaration and the clear, nothing else'
# SELF-COMPUTING. The app ALREADY has 14 `width:44px;height:44px;` rules -- 44px
# is an existing convention here, not something this build invents -- so a
# hardcoded ==1 fails on a correct patch. Assert the DELTA instead.
assert src.count('width:44px;height:44px;') == orig.count('width:44px;height:44px;') + 1, \
    'exactly one control should have grown to 44px'
assert orig.count('width:38px;height:38px;') - src.count('width:38px;height:38px;') == 1, \
    'exactly one 38px control should have gone'

# the nine existing callers must be untouched and still 2-arg
# This build ADDS the tenth caller (the gallery), so the counts differ by one --
# asserting they are equal was self-contradictory. What must hold is that the
# NINE that existed are untouched, which is checked by diffing their call text.
import re as _re
_calls = lambda t: _re.findall(r'CardinalResourceImages\.open\([^;]{0,120}', t)
_old, _new = _calls(orig), _calls(src)
# ⚠️ SIX CALLS, NOT NINE. `grep -c` counts matching LINES, not occurrences, and
# of the 9 substring hits three are `typeof ...open === 'function'` guards
# rather than calls. Counted with a paren: 6 before, 7 after.
assert len(_old) == 6 and len(_new) == 7, 'expected 6 -> 7 callers, got %d -> %d' % (len(_old), len(_new))
_added = [c for c in _new if c not in _old]
assert len(_added) == 1, 'more than one call site changed: %r' % _added
for c in _old:
    assert c in _new, 'an existing caller was altered: %r' % c[:80]
print('the 6 existing viewer calls are byte-identical; 1 added (7 total)')

# the gallery no longer jumps unconditionally
i = src.index("document.getElementById('phGrid').addEventListener")
blk = src[i:i+1400]
assert 'CardinalResourceImages.open' in blk, 'the grid must open the viewer'
assert blk.index('CardinalResourceImages.open') < blk.index('openProject(pid)'), \
    'the viewer must be tried BEFORE falling back to the jump'
print('gallery opens the viewer first, jump is the fallback')

# no new scroll-lock writer
assert src.count("document.body.style.overflow") == orig.count("document.body.style.overflow"), \
    'a 14th scroll-lock write would break the no-new-writer rule'
print('scroll-lock writes unchanged (%d)' % src.count("document.body.style.overflow"))

for tok in ['build 751 &#8212;', '{ b:751,']:
    assert tok in src, 'missing ' + tok
print('ALL SELF-CHECKS PASS')
